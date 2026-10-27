import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  FinancialResource,
  NeedCategory,
  Objective,
  OverallHealth,
  PresetId,
  ProjectStatus,
  StaleStatus,
  TranslationType,
} from "../types/project";
import type { RegionKey } from "../types/region";

export type YesNoFilter = "yes" | "no";
export type ProgressRange = "0-25" | "25-50" | "50-75" | "75-100";

export const YES_NO_VALUES: readonly YesNoFilter[] = ["yes", "no"];

export const PROGRESS_RANGES: readonly ProgressRange[] = [
  "0-25",
  "25-50",
  "50-75",
  "75-100",
];

export interface ProjectFilters {
  team: string | null;
  objective: Objective | null;
  status: ProjectStatus | null;
  health: OverallHealth | null;
  financial: FinancialResource | null;
  stale: StaleStatus | null;
  country: string | null;
  continent: RegionKey | null;
  vitality: string | null;
  translationType: TranslationType | null;
  eten: YesNoFilter | null;
  sensitive: YesNoFilter | null;
  progressRange: ProgressRange | null;
  needCategory: NeedCategory | null;
  hasMedia: YesNoFilter | null;
  hasOpenNeeds: YesNoFilter | null;
  attention: boolean;
  prayer: boolean;
  celebrate: boolean;
  recent: boolean;
}

export const EMPTY_FILTERS: ProjectFilters = {
  team: null,
  objective: null,
  status: null,
  health: null,
  financial: null,
  stale: null,
  country: null,
  continent: null,
  vitality: null,
  translationType: null,
  eten: null,
  sensitive: null,
  progressRange: null,
  needCategory: null,
  hasMedia: null,
  hasOpenNeeds: null,
  attention: false,
  prayer: false,
  celebrate: false,
  recent: false,
};

const FILTERS_KEY = "shema-filters-v1";

const FILTER_KEYS = Object.keys(EMPTY_FILTERS) as (keyof ProjectFilters)[];

/**
 * The filters that hold a value, in the order `EMPTY_FILTERS` declares them — the prototype's
 * `emptyFilters` order, which its *Filtros ativos* strip walks (`app.jsx:245`). *Limpar tudo*
 * and the strip both read this walk, so neither can show a filter the other does not.
 */
export function activeFilterKeys(
  filters: ProjectFilters,
): (keyof ProjectFilters)[] {
  return FILTER_KEYS.filter((key) => filters[key] !== EMPTY_FILTERS[key]);
}

export function hasActiveFilters(filters: ProjectFilters): boolean {
  return activeFilterKeys(filters).length > 0;
}

interface FiltersState {
  filters: ProjectFilters;
  search: string;
  setFilter: <K extends keyof ProjectFilters>(
    key: K,
    value: ProjectFilters[K],
  ) => void;
  togglePreset: (preset: PresetId) => void;
  clearFilter: <K extends keyof ProjectFilters>(key: K) => void;
  setSearch: (search: string) => void;
  applyState: (filters: ProjectFilters, search: string) => void;
  clearAll: () => void;
}

export const useFiltersStore = create<FiltersState>()(
  persist(
    (set) => ({
      filters: { ...EMPTY_FILTERS },
      search: "",
      setFilter: (key, value) =>
        set((state) => ({ filters: { ...state.filters, [key]: value } })),
      togglePreset: (preset) =>
        set((state) => ({
          filters: { ...state.filters, [preset]: !state.filters[preset] },
        })),
      clearFilter: (key) =>
        set((state) => ({
          filters: { ...state.filters, [key]: EMPTY_FILTERS[key] },
        })),
      setSearch: (search) => set({ search }),
      applyState: (filters, search) =>
        set({ filters: { ...EMPTY_FILTERS, ...filters }, search }),
      clearAll: () => set({ filters: { ...EMPTY_FILTERS }, search: "" }),
    }),
    {
      name: FILTERS_KEY,
      partialize: (state) => ({ filters: state.filters, search: state.search }),
    },
  ),
);
