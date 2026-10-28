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
import { useAuth } from "../../../contexts/AuthContext";
import { canReadHealth, canWriteHealth, newRecordOutsideWrites } from "../../../utils/access";
import type { RegionKey } from "../../../types/region";
import {
  recordAccess,
  writableDraft,
  type RecordAccess,
} from "../../../utils/recordAccess";

export function outsideWritesOf(
  isNew: boolean,
  writeRegionScope: readonly RegionKey[] | null | undefined,
  location: string,
): DraftHandle["outsideWrites"] {
  if (!isNew || !writeRegionScope) return null;
  const region = newRecordOutsideWrites(writeRegionScope, location);
  return region === null ? null : { region, writes: writeRegionScope };
}

export interface DraftHandle {
  values: ProjectDraft;
  /** What this coordinator actually wrote — the overlay, not the merge. */
  typed: ProjectDraft;
  saved?: Project;
  isNew: boolean;
  hasChanges: boolean;
  missing: RequiredField[];
  /**
   * A new record whose place falls outside where the account writes (OBT-593): the region the
   * place falls in and the regions it may file in. `null` (or absent) when the place is inside —
   * or names nothing yet, which `missing` says instead (OBT-654).
   */
  outsideWrites?: { region: RegionKey; writes: readonly RegionKey[] } | null;
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
export function useDraft(recordId: string): DraftHandle {
  const draft = useRecordStore((state) => state.drafts[recordId]);
  const updateDraft = useRecordStore((state) => state.updateDraft);
  const updateDraftValue = useRecordStore((state) => state.updateDraftValue);
  const discardDraft = useRecordStore((state) => state.discardDraft);
  const record = useProjectRecordStore((state) => state.record);
  const outcome = useProjectRecordStore((state) => state.outcome);

  const isNew = recordId === NEW_RECORD;
  const stored = isNew ? undefined : record?.project;

  const { user } = useAuth();
  const readsHealth = canReadHealth(user.roles);
  const writesHealth = canWriteHealth(user.roles);

  const place = useMemo(
    () => recordAccess(stored, isNew, readsHealth, writesHealth, user.writeRegionScope),
    [stored, isNew, readsHealth, writesHealth, user.writeRegionScope],
  );

  // A draft is kept per record, not per person: what somebody else typed into a field
  // this reader may not write is neither shown nor sent nor counted as a change.
  const writable = useMemo(
    () => writableDraft(draft, place, stored),
    [draft, place, stored],
  );

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
    outsideWrites: outsideWritesOf(isNew, user.writeRegionScope, values.location ?? ""),
    place,
    errors,
    errorsFor,
    set,
    update,
    discard,
  };
}
