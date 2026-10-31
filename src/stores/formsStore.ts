import { create } from "zustand";
import { persist } from "zustand/middleware";
import { formsAPI } from "../services/api";
import type { ReceivedSubmission, SubmissionApplyResult } from "../types/forms";
import {
  createHydrationSlot,
  hydrateOnce,
  NOT_HYDRATED,
  type HydrationStatus,
} from "./hydration";
import { useProjectsStore } from "./projectsStore";

const SUBMISSIONS_KEY = "shema-form-submissions-v1";

export const SUBMISSIONS_VERSION = 2;

interface FormsState extends HydrationStatus {
  submissions: ReceivedSubmission[];
  /** Submissions with an apply on its way — so a Pulse closed and opened again offers no second click. */
  applying: string[];
  hydrate: () => Promise<void>;
  applySubmission: (
    submissionId: string,
    version: string,
  ) => Promise<SubmissionApplyResult>;
}

type PersistedForms = Pick<FormsState, "submissions" | "hydrated">;

export const useFormsStore = create<FormsState>()(
  persist<FormsState, [], [], PersistedForms>(
    (set, get) => {
      const slot = createHydrationSlot();

      return {
        submissions: [],
        applying: [],
        ...NOT_HYDRATED,
        hydrate: () =>
          hydrateOnce(slot, get, set, async () => {
            set({ submissions: await formsAPI.received() });
          }),
        /**
         * The inbox's one write (OBT-652): the server's answer replaces the row, so *applied* is
         * the server's fact and the screen only reads it; the project list is outdated, as after
         * every write to a project (OBT-590). A conflict or a failure leaves the row as it was —
         * the Pulse is still waiting — and touches neither `loading` nor `hydrated`.
         */
        applySubmission: async (submissionId, version) => {
          set((state) => ({ applying: [...state.applying, submissionId] }));
          const result = await formsAPI.applySubmission(submissionId, version);
          set((state) => ({
            applying: state.applying.filter((id) => id !== submissionId),
            submissions: result.ok
              ? state.submissions.map((row) =>
                  row.id === submissionId ? result.submission : row,
                )
              : state.submissions,
          }));
          if (result.ok) useProjectsStore.getState().invalidate();
          return result;
        },
      };
    },
    {
      name: SUBMISSIONS_KEY,
      version: SUBMISSIONS_VERSION,
      migrate: () => ({ submissions: [], hydrated: false }),
      partialize: () => ({ submissions: [], hydrated: false }),
    },
  ),
);
