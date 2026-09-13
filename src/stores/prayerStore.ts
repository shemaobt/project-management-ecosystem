import { create } from "zustand";
import { persist } from "zustand/middleware";
import { intercessorsAPI } from "../services/api";
import type { Intercessor } from "../types/prayer";
import {
  makeIntercessor,
  type IntercessorDraft,
} from "../utils/intercessors";
import {
  createHydrationSlot,
  hydrateOnce,
  NOT_HYDRATED,
  type HydrationStatus,
} from "./hydration";

const INTERCESSORS_KEY = "shema-intercessors-v1";

export const INTERCESSORS_VERSION = 1;

interface PrayerState extends HydrationStatus {
  intercessors: Intercessor[];
  hydrate: () => Promise<void>;
  addIntercessor: (draft: IntercessorDraft, id: string) => boolean;
  updateIntercessor: (id: string, draft: IntercessorDraft) => boolean;
  removeIntercessor: (id: string) => void;
}

type PersistedPrayer = Pick<PrayerState, "intercessors" | "hydrated">;

export const usePrayerStore = create<PrayerState>()(
  persist<PrayerState, [], [], PersistedPrayer>(
    (set, get) => {
      const slot = createHydrationSlot();

      return {
        intercessors: [],
        ...NOT_HYDRATED,
        hydrate: () =>
          hydrateOnce(slot, get, set, async () => {
            set({ intercessors: await intercessorsAPI.list() });
          }),
        addIntercessor: (draft, id) => {
          const person = makeIntercessor(draft, id);
          if (!person) return false;
          set((state) => ({ intercessors: [person, ...state.intercessors] }));
          return true;
        },
        updateIntercessor: (id, draft) => {
          const current = get().intercessors.find((person) => person.id === id);
          if (!current) return false;
          const next = makeIntercessor(draft, id);
          if (!next) return false;
          set((state) => ({
            intercessors: state.intercessors.map((person) =>
              person.id === id ? { ...next, addedAt: current.addedAt } : person,
            ),
          }));
          return true;
        },
        removeIntercessor: (id) =>
          set((state) => ({
            intercessors: state.intercessors.filter(
              (person) => person.id !== id,
            ),
          })),
      };
    },
    {
      name: INTERCESSORS_KEY,
      version: INTERCESSORS_VERSION,
      migrate: () => ({ intercessors: [], hydrated: false }),
      partialize: (state) => ({
        intercessors: state.intercessors,
        hydrated: state.hydrated,
      }),
    },
  ),
);
