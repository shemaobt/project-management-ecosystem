import { create } from "zustand";
import { persist } from "zustand/middleware";
import { intercessorsAPI } from "../fixtures";
import type { Intercessor } from "../types/prayer";
import {
  makeIntercessor,
  type IntercessorDraft,
} from "../utils/intercessors";

const INTERCESSORS_KEY = "shema-intercessors-v1";

export const INTERCESSORS_VERSION = 1;

interface PrayerState {
  intercessors: Intercessor[];
  hydrated: boolean;
  hydrate: () => Promise<void>;
  addIntercessor: (draft: IntercessorDraft, id: string) => boolean;
  updateIntercessor: (id: string, draft: IntercessorDraft) => boolean;
  removeIntercessor: (id: string) => void;
}

type PersistedPrayer = Pick<PrayerState, "intercessors" | "hydrated">;

export const usePrayerStore = create<PrayerState>()(
  persist<PrayerState, [], [], PersistedPrayer>(
    (set, get) => ({
      intercessors: [],
      hydrated: false,
      hydrate: async () => {
        if (get().hydrated) return;
        const intercessors = await intercessorsAPI.list();
        set({ intercessors, hydrated: true });
      },
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
    }),
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
