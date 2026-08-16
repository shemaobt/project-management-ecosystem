import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AssessmentDraft } from "../types/assessment";
import { emptyDraft } from "../utils/assessment";
import { toLocalIsoDate } from "../utils/format";

const ASSESSMENTS_KEY = "shema-assessments-v1";

export const ASSESSMENTS_VERSION = 1;

interface AssessmentState {
  drafts: Record<string, AssessmentDraft>;
  draftFor: (projectId: string, now?: Date) => AssessmentDraft;
  saveStep: (draft: AssessmentDraft, now?: Date) => void;
  discardDraft: (projectId: string) => void;
}

type PersistedAssessments = Pick<AssessmentState, "drafts">;

export const useAssessmentStore = create<AssessmentState>()(
  persist<AssessmentState, [], [], PersistedAssessments>(
    (set, get) => ({
      drafts: {},
      draftFor: (projectId, now = new Date()) =>
        get().drafts[projectId] ?? emptyDraft(projectId, now),
      saveStep: (draft, now = new Date()) =>
        set((state) => ({
          drafts: {
            ...state.drafts,
            [draft.projectId]: { ...draft, savedAt: toLocalIsoDate(now) },
          },
        })),
      discardDraft: (projectId) =>
        set((state) => {
          const next = { ...state.drafts };
          delete next[projectId];
          return { drafts: next };
        }),
    }),
    {
      name: ASSESSMENTS_KEY,
      version: ASSESSMENTS_VERSION,
      migrate: () => ({ drafts: {} }),
      partialize: (state) => ({ drafts: state.drafts }),
    },
  ),
);
