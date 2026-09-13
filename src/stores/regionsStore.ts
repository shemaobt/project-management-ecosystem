import { create } from "zustand";
import { persist } from "zustand/middleware";
import { announceFailure, regionsAPI, toApiFailure } from "../services/api";
import type { Region, RegionKey, RoleChange } from "../types/region";
import type { SaveOutcome, TeamSaveResult } from "../types/team";
import { applyChanges, diffTeams, type TeamDrafts } from "../utils/team";
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
  ) => Promise<TeamSaveResult>;
}

type PersistedRegions = Pick<
  RegionsState,
  "regions" | "changes" | "hydrated"
>;

export const useRegionsStore = create<RegionsState>()(
  persist<RegionsState, [], [], PersistedRegions>(
    (set, get) => {
      const slot = createHydrationSlot();

      return {
        regions: [],
        changes: [],
        ...NOT_HYDRATED,
        hydrate: () =>
          hydrateOnce(slot, get, set, async () => {
            const [regions, changes] = await Promise.all([
              regionsAPI.list(),
              // The trail is a bonus read: a role without `coordinator` (or a
              // scope with nothing to show) refuses it, and that must not sink
              // the screen the seats themselves render fine without.
              regionsAPI.roleChanges().catch(() => get().changes),
            ]);
            set({ regions, changes });
          }),
        saveTeams: async (drafts, changedBy, now = new Date()) => {
          const { regions, changes } = get();
          const dirty = [
            ...new Set(
              diffTeams(regions, drafts, changedBy, now).map(
                (change) => change.regionKey,
              ),
            ),
          ];
          if (dirty.length === 0) {
            return { outcome: { changed: 0, filled: 0, cleared: 0 }, failedRegions: [] };
          }

          const results = await Promise.allSettled(
            dirty.map((regionKey) => {
              const region = regions.find((entry) => entry.key === regionKey);
              const draft = drafts[regionKey];
              if (!region || !draft) {
                return Promise.reject(new Error(`unknown region '${regionKey}'`));
              }
              return regionsAPI.saveTeam(
                regionKey,
                region.team,
                draft,
                changedBy,
                now,
              );
            }),
          );

          const outcome: SaveOutcome = { changed: 0, filled: 0, cleared: 0 };
          const won: RoleChange[] = [];
          const failedRegions: RegionKey[] = [];
          results.forEach((result, index) => {
            if (result.status === "fulfilled") {
              outcome.changed += result.value.outcome.changed;
              outcome.filled += result.value.outcome.filled;
              outcome.cleared += result.value.outcome.cleared;
              won.push(...result.value.changes);
            } else {
              failedRegions.push(dirty[index]);
              announceFailure(toApiFailure(result.reason));
            }
          });

          if (won.length > 0) {
            set({
              regions: applyChanges(regions, won),
              changes: [...changes, ...won],
            });
          }
          return { outcome, failedRegions };
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
