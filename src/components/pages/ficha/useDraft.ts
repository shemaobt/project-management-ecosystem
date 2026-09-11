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

export interface DraftHandle {
  values: ProjectDraft;
  saved?: Project;
  isNew: boolean;
  hasChanges: boolean;
  missing: RequiredField[];
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

export function useDraft(recordId: string): DraftHandle {
  const draft = useRecordStore((state) => state.drafts[recordId]);
  const updateDraft = useRecordStore((state) => state.updateDraft);
  const updateDraftValue = useRecordStore((state) => state.updateDraftValue);
  const discardDraft = useRecordStore((state) => state.discardDraft);
  const record = useProjectRecordStore((state) => state.record);
  const outcome = useProjectRecordStore((state) => state.outcome);

  const isNew = recordId === NEW_RECORD;
  const stored = isNew ? undefined : record?.project;

  const values = useMemo(
    () => ({ ...makeEmptyProject(), ...stored, ...draft }),
    [stored, draft],
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
    saved: stored,
    isNew,
    hasChanges: Object.keys(draft ?? {}).length > 0,
    missing: missingRequired(values),
    errors,
    errorsFor,
    set,
    update,
    discard,
  };
}
