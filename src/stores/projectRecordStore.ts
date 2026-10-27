import { create } from "zustand";
import {
  healthAssessmentsAPI,
  projectRecordAPI,
  toApiFailure,
  toWire,
  type RecordSaveResult,
} from "../services/api";
import type { AssessmentDraft } from "../types/assessment";
import type { Project } from "../types/project";
import type { RegionKey } from "../types/region";
import type {
  LoadedRecord,
  RecordConflict,
  RecordField,
  RecordFieldError,
  RecordSaveReport,
} from "../types/projectRecord";
import type { ApiFailure } from "../types/session";
import { mayWrite, recordAccess } from "../utils/recordAccess";
import { useProjectsStore } from "./projectsStore";
import {
  changedFields,
  filedDraft,
  overlappingFields,
  tabsOf,
  withheldFields,
} from "./recordDiff";

export {
  changedFields,
  filedDraft,
  overlappingFields,
  tabOfFirstError,
  tabsOf,
  withheldFields,
} from "./recordDiff";

/**
 * `values` is what the record would become and `typed` is what somebody actually wrote.
 * They are two arguments because the two questions are different: the diff is taken
 * against the merged view, and *what did this person enter* can only be read off the
 * draft overlay.
 */
export interface SaveAttempt {
  values: Partial<Project>;
  typed: Partial<Project>;
  isNew: boolean;
  readsHealth: boolean;
  writesHealth: boolean;
  writeRegionScope?: readonly RegionKey[] | null;
  filedAt?: string;
}

export type SaveOutcome =
  | { kind: "saved"; report: RecordSaveReport }
  | {
      kind: "landed";
      id: string;
      carried: Partial<Project>;
      pending: RecordField[];
      withheld: RecordField[];
    }
  | { kind: "landedUnread"; id: string; failure: ApiFailure }
  | { kind: "conflict"; conflict: RecordConflict; overlap: RecordField[] }
  | { kind: "invalid"; errors: RecordFieldError[] }
  | { kind: "failed"; failure: ApiFailure }
  | { kind: "unchanged"; withheld: RecordField[] };

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
  save: (attempt: SaveAttempt) => Promise<SaveOutcome>;
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
  typed: Partial<Project>,
): SaveOutcome {
  switch (result.reason) {
    case "conflict":
      return {
        kind: "conflict",
        conflict: result.conflict,
        overlap: overlappingFields(result.conflict, typed),
      };
    case "invalid":
      return { kind: "invalid", errors: result.errors };
    case "failed":
      return { kind: "failed", failure: result.failure };
  }
}

/**
 * A create's 409 on the draft's own id, read for what it is (OBT-625): the slug is minted once
 * and never leaves the draft, so the record the server names is the one an earlier attempt of
 * this draft filed — its answer lost, not its write. The record is read and set underneath,
 * and what the draft still holds is `filedDraft`'s; a read that fails says the record exists
 * rather than that somebody else saved it. Either way the list is outdated: the write landed.
 */
async function readLanded(
  id: string,
  typed: Partial<Project>,
  readsHealth: boolean,
  writesHealth: boolean,
  writeRegionScope: readonly RegionKey[] | null | undefined,
): Promise<SaveOutcome> {
  useProjectsStore.getState().invalidate();
  try {
    const record = await projectRecordAPI.read(id);
    useProjectRecordStore.setState({ id, record });
    const access = recordAccess(
      record.project,
      false,
      readsHealth,
      writesHealth,
      writeRegionScope,
    );
    return { kind: "landed", id, ...filedDraft(typed, record.project, access) };
  } catch (thrown) {
    return { kind: "landedUnread", id, failure: toApiFailure(thrown) };
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

  /**
   * Always a fresh read. A cached record is one somebody else may have moved since, and
   * the version it carries is what the next save stands on — re-opening a record to find
   * a stale version is the conflict this screen exists to avoid handing people.
   */
  open: async (id) => {
    if (get().id !== id) {
      set({ id, record: null, loading: true, loadError: null, outcome: null });
    }
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
   * One request carrying the diff, and its answers — none of which touches the draft.
   *
   * A conflict re-reads the record so the next attempt quotes the current version and
   * the reader can see what the other person wrote, **and stops there**: retrying by
   * itself is last-write-wins with an extra round trip. Pressing save again is the
   * decision, and it is the coordinator's. A create's 409 is not a conflict: it is the
   * record this draft already filed, and it lands (`readLanded`).
   */
  save: async ({ values: draft, typed, isNew, readsHealth, writesHealth, writeRegionScope, filedAt }) => {
    const withheld = withheldFields(typed);

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
        useProjectsStore.getState().invalidate();
        return outcome;
      }
      if (result.reason === "conflict") {
        const outcome = await readLanded(
          (draft as Project).id,
          typed,
          readsHealth,
          writesHealth,
          writeRegionScope,
        );
        set({ saving: false, outcome });
        return outcome;
      }
      const outcome = refusal(result, typed);
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

    // Second net under the draft filter (useDraft): a field this reader may not write
    // never travels, so a stale draft cannot turn the whole save into a 403 (OBT-532).
    const access = recordAccess(record.project, false, readsHealth, writesHealth, writeRegionScope);
    const fields = changedFields(draft, record.project).filter((field) =>
      mayWrite(access, field),
    );
    if (fields.length === 0) {
      // No request goes out, so this is **not** a save — and it must not be answered
      // with one. Somebody who only typed into a tab this endpoint does not take yet
      // would otherwise read *"Asháninka salvo."* over a record the server never heard
      // about. The withheld half still travels with the answer, because it is the half
      // that has to be said: the input is in this browser and nowhere else.
      const outcome: SaveOutcome = { kind: "unchanged", withheld };
      set({ outcome });
      return outcome;
    }

    // A lost create's difference quotes the version the record was filed at: whoever saved it
    // since is the server's 409, with who and what, not an overwrite (OBT-625).
    const quoted = filedAt ?? record.version;
    set({ saving: true, outcome: null });
    const result = await projectRecordAPI.patch(id, toWire(draft, fields), quoted);

    if (result.ok) {
      const outcome: SaveOutcome = {
        kind: "saved",
        report: report(fields, withheld),
      };
      set({ record: result.record, saving: false, outcome });
      useProjectsStore.getState().invalidate();
      return outcome;
    }

    const outcome = refusal(result, typed);
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
      useProjectsStore.getState().invalidate();
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
