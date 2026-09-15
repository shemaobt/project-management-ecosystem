import { create } from "zustand";
import { persist } from "zustand/middleware";
import { announceFailure, intercessorsAPI, toApiFailure } from "../services/api";
import type { ConsentContext, IntercessorEntry } from "../types/prayer";
import {
  makeIntercessorCreate,
  makeIntercessorUpdate,
  type IntercessorCreateDraft,
  type IntercessorEditDraft,
} from "../utils/intercessors";
import {
  createHydrationSlot,
  hydrateOnce,
  NOT_HYDRATED,
  type HydrationStatus,
} from "./hydration";

const INTERCESSORS_KEY = "shema-intercessors-v1";

export const INTERCESSORS_VERSION = 2;

interface PrayerState extends HydrationStatus {
  intercessors: IntercessorEntry[];
  /** People the network holds who withheld `directory` consent — a count, never a name (§8.1 rule 2's precedent). */
  withheldCount: number;
  hydrate: () => Promise<void>;
  addIntercessor: (draft: IntercessorCreateDraft) => Promise<boolean>;
  updateIntercessor: (id: string, draft: IntercessorEditDraft) => Promise<boolean>;
  removeIntercessor: (id: string) => Promise<boolean>;
  revealContact: (id: string) => Promise<string | null>;
}

type PersistedPrayer = Pick<
  PrayerState,
  "intercessors" | "withheldCount" | "hydrated"
>;

async function safely<T>(action: () => Promise<T>): Promise<T | null> {
  try {
    return await action();
  } catch (error) {
    announceFailure(toApiFailure(error));
    return null;
  }
}

export const usePrayerStore = create<PrayerState>()(
  persist<PrayerState, [], [], PersistedPrayer>(
    (set, get) => {
      const slot = createHydrationSlot();

      return {
        intercessors: [],
        withheldCount: 0,
        ...NOT_HYDRATED,
        hydrate: () =>
          hydrateOnce(slot, get, set, async () => {
            const directory = await intercessorsAPI.list();
            set({
              intercessors: directory.people,
              withheldCount: directory.withheldCount,
            });
          }),
        addIntercessor: async (draft) => {
          const payload = makeIntercessorCreate(draft);
          if (!payload) return false;

          const created = await safely(() => intercessorsAPI.create(payload));
          if (!created) return false;

          if (!draft.listInDirectory) {
            set((state) => ({ withheldCount: state.withheldCount + 1 }));
            return true;
          }

          const listed = await safely(() =>
            intercessorsAPI.grantConsent(
              created.id,
              "directory",
              payload.consentBasis,
            ),
          );
          const entry = listed ?? created;
          if (!listed) {
            // The person is held but not shown until the directory consent
            // lands — announced already by `safely`, so the count carries it.
            set((state) => ({ withheldCount: state.withheldCount + 1 }));
            return true;
          }
          set((state) => ({ intercessors: [entry, ...state.intercessors] }));
          return true;
        },
        updateIntercessor: async (id, draft) => {
          const payload = makeIntercessorUpdate(draft);
          if (!payload) return false;

          const updated = await safely(() => intercessorsAPI.update(id, payload));
          if (!updated) return false;

          set((state) => ({
            intercessors: state.intercessors.map((person) =>
              person.id === id ? updated : person,
            ),
          }));
          return true;
        },
        removeIntercessor: async (id) => {
          const ok = (await safely(() => intercessorsAPI.remove(id))) !== null;
          if (!ok) return false;

          set((state) => ({
            intercessors: state.intercessors.filter((person) => person.id !== id),
          }));
          return true;
        },
        revealContact: (id) => safely(() => intercessorsAPI.contact(id)),
      };
    },
    {
      name: INTERCESSORS_KEY,
      version: INTERCESSORS_VERSION,
      migrate: () => ({ intercessors: [], withheldCount: 0, hydrated: false }),
      partialize: (state) => ({
        intercessors: state.intercessors,
        withheldCount: state.withheldCount,
        hydrated: state.hydrated,
      }),
    },
  ),
);

export type { ConsentContext };
