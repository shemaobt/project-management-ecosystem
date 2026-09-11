import { create } from "zustand";
import { persist } from "zustand/middleware";
import { formsAPI } from "../services/api";
import type { ReceivedSubmission } from "../types/forms";
import {
  createHydrationSlot,
  hydrateOnce,
  NOT_HYDRATED,
  type HydrationStatus,
} from "./hydration";

const SUBMISSIONS_KEY = "shema-form-submissions-v1";

export const SUBMISSIONS_VERSION = 1;

interface FormsState extends HydrationStatus {
  submissions: ReceivedSubmission[];
  hydrate: () => Promise<void>;
}

type PersistedForms = Pick<FormsState, "submissions" | "hydrated">;

export const useFormsStore = create<FormsState>()(
  persist<FormsState, [], [], PersistedForms>(
    (set, get) => {
      const slot = createHydrationSlot();

      return {
        submissions: [],
        ...NOT_HYDRATED,
        hydrate: () =>
          hydrateOnce(slot, get, set, async () => {
            set({ submissions: await formsAPI.received() });
          }),
      };
    },
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
