import { useCallback, useMemo } from "react";
import {
  makeEmptyProject,
  missingRequired,
  NEW_RECORD,
  useRecordStore,
  type ProjectDraft,
  type RequiredField,
} from "../../../stores/recordStore";
import { selectProject, useProjectsStore } from "../../../stores/projectsStore";
import type { Project } from "../../../types/project";

export interface DraftHandle {
  values: ProjectDraft;
  isNew: boolean;
  hasChanges: boolean;
  missing: RequiredField[];
  set: <K extends keyof Project>(field: K, value: Project[K]) => void;
  discard: () => void;
}

export function useDraft(recordId: string): DraftHandle {
  const draft = useRecordStore((state) => state.drafts[recordId]);
  const updateDraft = useRecordStore((state) => state.updateDraft);
  const discardDraft = useRecordStore((state) => state.discardDraft);
  const projects = useProjectsStore((state) => state.projects);

  const isNew = recordId === NEW_RECORD;
  const stored = isNew ? undefined : selectProject(projects, recordId);

  const values = useMemo(
    () => ({ ...makeEmptyProject(), ...stored, ...draft }),
    [stored, draft],
  );

  const set = useCallback(
    <K extends keyof Project>(field: K, value: Project[K]) => {
      updateDraft(recordId, { [field]: value } as ProjectDraft);
    },
    [recordId, updateDraft],
  );

  const discard = useCallback(
    () => discardDraft(recordId),
    [recordId, discardDraft],
  );

  return {
    values,
    isNew,
    hasChanges: Object.keys(draft ?? {}).length > 0,
    missing: missingRequired(values),
    set,
    discard,
  };
}
