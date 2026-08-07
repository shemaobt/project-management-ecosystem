import { create } from "zustand";
import { regionsAPI } from "../fixtures";
import type { Region } from "../types/region";

interface RegionsState {
  regions: Region[];
  hydrated: boolean;
  hydrate: () => Promise<void>;
}

export const useRegionsStore = create<RegionsState>()((set, get) => {
  let pending: Promise<void> | null = null;
  return {
    regions: [],
    hydrated: false,
    hydrate: () => {
      if (get().hydrated) return Promise.resolve();
      pending ??= regionsAPI.list().then((regions) => {
        set({ regions, hydrated: true });
        pending = null;
      });
      return pending;
    },
  };
});
