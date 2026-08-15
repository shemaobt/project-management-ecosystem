import { create } from "zustand";
import { persist } from "zustand/middleware";
import { formsAPI } from "../fixtures";
import type { ReceivedSubmission } from "../types/forms";

const SUBMISSIONS_KEY = "shema-form-submissions-v1";

export const SUBMISSIONS_VERSION = 1;

interface FormsState {
  submissions: ReceivedSubmission[];
  hydrated: boolean;
  hydrate: () => Promise<void>;
}

type PersistedForms = Pick<FormsState, "submissions" | "hydrated">;

export const useFormsStore = create<FormsState>()(
  persist<FormsState, [], [], PersistedForms>(
    (set, get) => ({
      submissions: [],
      hydrated: false,
      hydrate: async () => {
        if (get().hydrated) return;
        const submissions = await formsAPI.received();
        set({ submissions, hydrated: true });
      },
    }),
    {
      name: SUBMISSIONS_KEY,
      version: SUBMISSIONS_VERSION,
      migrate: () => ({ submissions: [], hydrated: false }),
      partialize: (state) => ({
        submissions: state.submissions,
        hydrated: state.hydrated,
      }),
    },
  ),
);
