import { useCallback, useMemo } from "react";
import {
  makeEmptyProject,
  missingRequired,
  NEW_RECORD,
  useRecordStore,
  type ProjectDraft,
  type RequiredField,
} from "../../../stores/recordStore";
import { useProjectRecordStore } from "../../../stores/projectRecordStore";
import type { Project } from "../../../types/project";
import type { RecordField, RecordFieldError } from "../../../types/projectRecord";
import {
  mayWrite,
  recordAccess,
  type RecordAccess,
} from "../../../utils/recordAccess";

export interface DraftHandle {
  values: ProjectDraft;
  /** What this coordinator actually wrote — the overlay, not the merge. */
  typed: ProjectDraft;
  saved?: Project;
  isNew: boolean;
  hasChanges: boolean;
  missing: RequiredField[];
  /** What this reader may see and write of the place — from the server's `readAs` (OBT-532). */
  place: RecordAccess;
  /** The server's refusals for this record, located — empty until a save is refused. */
  errors: RecordFieldError[];
  errorsFor: (field: RecordField) => RecordFieldError[];
  set: <K extends keyof Project>(field: K, value: Project[K]) => void;
  update: <K extends keyof Project>(
    field: K,
    updater: (current: Project[K] | undefined) => Project[K],
  ) => void;
  discard: () => void;
}

const NO_ERRORS: RecordFieldError[] = [];
const EMPTY_DRAFT: ProjectDraft = {};

function writableDraft(
  draft: ProjectDraft | undefined,
  place: RecordAccess,
): ProjectDraft {
  if (!draft) return EMPTY_DRAFT;
  const kept = Object.entries(draft).filter(
    ([field]) => field !== "readAs" && mayWrite(place, field as RecordField),
  );
  return kept.length === Object.keys(draft).length
    ? draft
    : (Object.fromEntries(kept) as ProjectDraft);
}

export function useDraft(recordId: string): DraftHandle {
  const draft = useRecordStore((state) => state.drafts[recordId]);
  const updateDraft = useRecordStore((state) => state.updateDraft);
  const updateDraftValue = useRecordStore((state) => state.updateDraftValue);
  const discardDraft = useRecordStore((state) => state.discardDraft);
  const record = useProjectRecordStore((state) => state.record);
  const outcome = useProjectRecordStore((state) => state.outcome);

  const isNew = recordId === NEW_RECORD;
  const stored = isNew ? undefined : record?.project;

  const place = useMemo(() => recordAccess(stored, isNew), [stored, isNew]);

  // A draft is kept per record, not per person: what somebody else typed into a field
  // this reader may not write is neither shown nor sent nor counted as a change.
  const writable = useMemo(() => writableDraft(draft, place), [draft, place]);

  const values = useMemo(
    () => ({
      ...makeEmptyProject(),
      ...stored,
      ...writable,
      readAs: isNew ? ("coordination" as const) : stored?.readAs,
    }),
    [stored, writable, isNew],
  );

  const errors = outcome?.kind === "invalid" ? outcome.errors : NO_ERRORS;

  const set = useCallback(
    <K extends keyof Project>(field: K, value: Project[K]) => {
      updateDraft(recordId, { [field]: value } as ProjectDraft);
    },
    [recordId, updateDraft],
  );

  const update = useCallback(
    <K extends keyof Project>(
      field: K,
      updater: (current: Project[K] | undefined) => Project[K],
    ) => {
      updateDraftValue(recordId, field, (current) =>
        updater(current !== undefined ? current : stored?.[field]),
      );
    },
    [recordId, stored, updateDraftValue],
  );

  const errorsFor = useCallback(
    (field: RecordField) => errors.filter((error) => error.field === field),
    [errors],
  );

  const discard = useCallback(
    () => discardDraft(recordId),
    [recordId, discardDraft],
  );

  return {
    values,
    typed: writable,
    saved: stored,
    isNew,
    hasChanges: Object.keys(writable).length > 0,
    missing: missingRequired(values, place),
    place,
    errors,
    errorsFor,
    set,
    update,
    discard,
  };
}
