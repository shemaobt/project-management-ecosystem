import { create } from "zustand";
import { persist } from "zustand/middleware";
import { regionsAPI } from "../services/api";
import type { Region, RoleChange } from "../types/region";
import type { SaveOutcome } from "../types/team";
import { applyChanges, diffTeams, summarize, type TeamDrafts } from "../utils/team";
import {
  createHydrationSlot,
  hydrateOnce,
  NOT_HYDRATED,
  type HydrationStatus,
} from "./hydration";

const REGIONS_KEY = "shema-regions-v1";

export const REGIONS_VERSION = 1;

interface RegionsState extends HydrationStatus {
  regions: Region[];
  changes: RoleChange[];
  hydrate: () => Promise<void>;
  saveTeams: (
    drafts: TeamDrafts,
    changedBy: string,
    now?: Date,
  ) => SaveOutcome;
}

type PersistedRegions = Pick<
  RegionsState,
  "regions" | "changes" | "hydrated"
>;

export const useRegionsStore = create<RegionsState>()(
  persist<RegionsState, [], [], PersistedRegions>(
    (set, get) => {
      const slot = createHydrationSlot();
      const load = async () => {
        set({ regions: await regionsAPI.list() });
      };

      return {
        regions: [],
        changes: [],
        ...NOT_HYDRATED,
        hydrate: () => hydrateOnce(slot, get, set, load),
        saveTeams: (drafts, changedBy, now = new Date()) => {
          const { regions, changes } = get();
          const fresh = diffTeams(regions, drafts, changedBy, now);
          if (fresh.length > 0) {
            set({
              regions: applyChanges(regions, fresh),
              changes: [...changes, ...fresh],
            });
          }
          return summarize(fresh);
        },
      };
    },
    {
      name: REGIONS_KEY,
      version: REGIONS_VERSION,
      migrate: () => ({ regions: [], changes: [], hydrated: false }),
      partialize: (state) => ({
        regions: state.regions,
        changes: state.changes,
        hydrated: state.hydrated,
      }),
    },
  ),
);
