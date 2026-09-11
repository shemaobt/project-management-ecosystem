import { create } from "zustand";
import { RECORD_TABS, type RecordTabId } from "../constants/recordTabs";
import {
  allWritableFields,
  PENDING_WRITE,
  SERVER_WRITABLE,
  tabOf,
} from "../constants/recordFields";
import {
  healthAssessmentsAPI,
  projectRecordAPI,
  toApiFailure,
  toWire,
  type RecordSaveResult,
} from "../services/api";
import type { AssessmentDraft } from "../types/assessment";
import type { Project } from "../types/project";
import type {
  LoadedRecord,
  RecordConflict,
  RecordField,
  RecordFieldError,
  RecordSaveReport,
} from "../types/projectRecord";
import type { ApiFailure } from "../types/session";

/** A field whose two values differ — `JSON` because half of them are arrays. */
function differs(left: unknown, right: unknown): boolean {
  if (left === right) return false;
  return JSON.stringify(left ?? null) !== JSON.stringify(right ?? null);
}

/**
 * What a save is about to send: the fields the coordinator changed, and nothing else.
 *
 * This is the whole of *save what changed, per tab, not the record* — a field a tab did
 * not touch never travels, so tab 3 cannot write tab 7's values as they stood when tab
 * 3 was opened. It is a **diff**, not a tab cut: cutting by tab would either still send
 * that tab's untouched fields (the same overwrite, one tab narrower) or need one
 * request per tab, and a twenty-row progress table has to be one write with one result.
 */
export function changedFields(
  draft: Partial<Project>,
  saved: Project | null,
): RecordField[] {
  return allWritableFields().filter(
    (field) =>
      field in draft && (saved === null || differs(draft[field], saved[field])),
  );
}

/** Fields a tab still edits that this endpoint does not take — kept, never reported. */
export function withheldFields(draft: Partial<Project>): RecordField[] {
  return RECORD_TABS.flatMap((tab) => PENDING_WRITE[tab]?.fields ?? []).filter(
    (field) => field in draft && !SERVER_WRITABLE.has(field),
  );
}

/** The tabs a save actually wrote, in the record's own order. */
export function tabsOf(fields: readonly RecordField[]): RecordTabId[] {
  return RECORD_TABS.filter((tab) =>
    fields.some((field) => tabOf(field) === tab),
  );
}

/** The tab a refusal points at, so a blocked save can land the reader on it. */
export function tabOfFirstError(
  errors: readonly RecordFieldError[],
): RecordTabId | null {
  for (const error of errors) {
    const tab = error.field ? tabOf(error.field) : null;
    if (tab) return tab;
  }
  return null;
}

/**
 * A conflict, read against what this coordinator had typed.
 *
 * The overlap is the sentence that matters: *somebody else changed this record* can be
 * answered by pressing save again, while *you and Maria both changed the status* cannot
 * be answered without a person looking at it. Both are said, and neither decides
 * anything.
 */
export function overlappingFields(
  conflict: RecordConflict,
  draft: Partial<Project>,
): RecordField[] {
  return conflict.changedFields.filter((field) => field in draft);
}

export type SaveOutcome =
  | { kind: "saved"; report: RecordSaveReport }
  | { kind: "conflict"; conflict: RecordConflict; overlap: RecordField[] }
  | { kind: "invalid"; errors: RecordFieldError[] }
  | { kind: "failed"; failure: ApiFailure }
  | { kind: "unchanged" };

/**
 * What filing one health reading (BE-07 · INT-04) answered — no `"conflict"` and no
 * `"unchanged"`: appending always changes something, and the endpoint has no version to
 * race against (`append_assessment.py`'s own argument for skipping `If-Match`).
 */
export type AssessmentOutcome =
  | { kind: "saved"; project: Project }
  | { kind: "invalid"; errors: RecordFieldError[] }
  | { kind: "failed"; failure: ApiFailure };

interface RecordStoreState {
  id: string | null;
  record: LoadedRecord | null;
  loading: boolean;
  loadError: ApiFailure | null;
  saving: boolean;
  outcome: SaveOutcome | null;
  open: (id: string) => Promise<void>;
  reload: () => Promise<void>;
  save: (draft: Partial<Project>, isNew: boolean) => Promise<SaveOutcome>;
  submitAssessment: (
    draft: AssessmentDraft,
    actorName: string,
  ) => Promise<AssessmentOutcome>;
  dismiss: () => void;
  forget: () => void;
}

function report(
  fields: readonly RecordField[],
  withheld: readonly RecordField[],
): RecordSaveReport {
  return {
    written: tabsOf(fields),
    writtenFields: [...fields],
    withheld: [...withheld],
  };
}

function refusal(
  result: Exclude<RecordSaveResult, { ok: true }>,
  draft: Partial<Project>,
): SaveOutcome {
  switch (result.reason) {
    case "conflict":
      return {
        kind: "conflict",
        conflict: result.conflict,
        overlap: overlappingFields(result.conflict, draft),
      };
    case "invalid":
      return { kind: "invalid", errors: result.errors };
    case "failed":
      return { kind: "failed", failure: result.failure };
  }
}

/**
 * The ficha's own store: one record at a time, its version, and the result of the last
 * save attempt.
 *
 * **Nothing here is persisted.** The record belongs to the server, and a copy kept in
 * this browser would be a second answer to *what does this record say*; what survives a
 * reload is the coordinator's *draft*, which `recordStore` persists and which is the
 * only thing losing would cost anybody work. That split is also what makes the conflict
 * answer safe: the draft is an overlay of the fields somebody typed, so re-reading the
 * record underneath it keeps every one of them.
 */
export const useProjectRecordStore = create<RecordStoreState>()((set, get) => ({
  id: null,
  record: null,
  loading: false,
  loadError: null,
  saving: false,
  outcome: null,

  open: async (id) => {
    if (get().id === id && get().record) return;
    set({ id, record: null, loading: true, loadError: null, outcome: null });
    await get().reload();
  },

  reload: async () => {
    const id = get().id;
    if (!id) return;
    set({ loading: true, loadError: null });
    try {
      const record = await projectRecordAPI.read(id);
      if (get().id === id) set({ record, loading: false });
    } catch (thrown) {
      if (get().id === id) {
        set({ loading: false, loadError: toApiFailure(thrown) });
      }
    }
  },

  /**
   * One request carrying the diff, and four answers — none of which touches the draft.
   *
   * A conflict re-reads the record so the next attempt quotes the current version and
   * the reader can see what the other person wrote, **and stops there**: retrying by
   * itself is last-write-wins with an extra round trip. Pressing save again is the
   * decision, and it is the coordinator's.
   */
  save: async (draft, isNew) => {
    const withheld = withheldFields(draft);

    if (isNew) {
      set({ saving: true, outcome: null });
      const result = await projectRecordAPI.create(draft as Project);
      if (result.ok) {
        const outcome: SaveOutcome = {
          kind: "saved",
          report: report(changedFields(draft, null), withheld),
        };
        set({
          id: result.record.project.id,
          record: result.record,
          saving: false,
          outcome,
        });
        return outcome;
      }
      const outcome = refusal(result, draft);
      set({ saving: false, outcome });
      return outcome;
    }

    const { id, record } = get();
    if (!id || !record) {
      const outcome: SaveOutcome = {
        kind: "failed",
        failure: toApiFailure(null),
      };
      set({ outcome });
      return outcome;
    }

    const fields = changedFields(draft, record.project);
    if (fields.length === 0) {
      const outcome: SaveOutcome = withheld.length > 0
        ? { kind: "saved", report: report([], withheld) }
        : { kind: "unchanged" };
      set({ outcome });
      return outcome;
    }

    set({ saving: true, outcome: null });
    const result = await projectRecordAPI.patch(
      id,
      toWire(draft, fields),
      record.version,
    );

    if (result.ok) {
      const outcome: SaveOutcome = {
        kind: "saved",
        report: report(fields, withheld),
      };
      set({ record: result.record, saving: false, outcome });
      return outcome;
    }

    const outcome = refusal(result, draft);
    if (result.reason === "conflict") {
      // Take the other person's record underneath the draft, so the next attempt quotes
      // a version that exists and the reader can see what moved. The draft is untouched.
      try {
        const fresh = await projectRecordAPI.read(id);
        if (get().id === id) set({ record: fresh });
      } catch {
        // The reload failed too. The conflict still stands and is still worth saying;
        // the next attempt meets the same 409 and re-reads from here.
      }
    }
    set({ saving: false, outcome });
    return outcome;
  },

  /**
   * File one reading against whatever record is currently open. Deliberately does not
   * touch `saving`/`outcome`: those belong to the ficha's own ten-tab save, and the
   * wizard is a different screen with its own transient state — sharing the flag would
   * let a stale ficha refusal bleed into the wizard, or the other way round, the moment
   * both routes have touched the same open record in one session.
   *
   * A success replaces `record` with the server's own — the true `overall`, `author`
   * and `questionSetVersion` BE-07 stamped, never guessed here.
   */
  submitAssessment: async (draft, actorName) => {
    const { id } = get();
    if (!id) return { kind: "failed", failure: toApiFailure(null) };

    const result = await healthAssessmentsAPI.submit(id, draft, actorName);
    if (result.ok) {
      set({ record: result.record });
      return { kind: "saved", project: result.record.project };
    }
    if (result.reason === "invalid") {
      return { kind: "invalid", errors: result.errors };
    }
    if (result.reason === "failed") {
      return { kind: "failed", failure: result.failure };
    }
    // The endpoint never answers 409 (module docstring); kept only for exhaustiveness.
    return { kind: "failed", failure: toApiFailure(null) };
  },

  dismiss: () => set({ outcome: null }),

  forget: () =>
    set({
      id: null,
      record: null,
      loading: false,
      loadError: null,
      saving: false,
      outcome: null,
    }),
}));
