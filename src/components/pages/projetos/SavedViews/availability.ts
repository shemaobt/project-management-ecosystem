import { normaliseMetaphor } from "../../../../constants/metaphors";
import { EMPTY_FILTERS, type ProjectFilters } from "../../../../stores/filtersStore";
import type { PresetId, Project } from "../../../../types/project";
import type { ViewState } from "../../../../utils/filterSerialisation";
import { filterProjects, type FacetCounts, type FacetGroup } from "../../../../utils/search";

const FACET_FILTERS = [
  "status",
  "team",
  "health",
  "objective",
  "financial",
  "stale",
  "country",
  "continent",
  "vitality",
  "translationType",
  "needCategory",
  "eten",
  "sensitive",
  "progressRange",
  "hasMedia",
] as const satisfies readonly FacetGroup[];

const PRESET_FILTERS = [
  "attention",
  "prayer",
  "celebrate",
  "recent",
] as const satisfies readonly PresetId[];

type FilterKey = (typeof FACET_FILTERS)[number] | PresetId;

export const FILTER_LABEL_KEYS: Record<FilterKey, string> = {
  status: "sb_status",
  team: "sb_team",
  health: "sb_health",
  objective: "sb_objective",
  financial: "sb_financial",
  stale: "sb_stale",
  country: "sb_country",
  continent: "sb_continent",
  vitality: "sb_vitality",
  translationType: "sb_translation_type",
  needCategory: "sb_needs_section",
  eten: "sb_eten",
  sensitive: "sb_sensitive",
  progressRange: "sb_progress_range",
  hasMedia: "sb_media",
  attention: "preset_urgent",
  prayer: "preset_prayer",
  celebrate: "preset_celebrate",
  recent: "preset_recent",
};

export interface UnavailableFilter {
  key: FilterKey;
  value: string;
}

export function datasetCounts(projects: readonly Project[]): FacetCounts {
  return filterProjects(projects, EMPTY_FILTERS, "").counts;
}

export function findUnavailable(
  filters: ProjectFilters,
  counts: FacetCounts,
): UnavailableFilter[] {
  const missing: UnavailableFilter[] = [];
  for (const key of FACET_FILTERS) {
    const value = filters[key];
    if (typeof value !== "string" || !value) continue;
    const group: Record<string, number | undefined> = counts[key];
    if (!group[value]) missing.push({ key, value });
  }
  for (const key of PRESET_FILTERS) {
    if (filters[key] && !counts.preset[key]) missing.push({ key, value: key });
  }
  return missing;
}

function clearFilter<K extends keyof ProjectFilters>(
  filters: ProjectFilters,
  key: K,
): void {
  filters[key] = EMPTY_FILTERS[key];
}

export function withoutUnavailable(
  filters: ProjectFilters,
  missing: readonly UnavailableFilter[],
): ProjectFilters {
  const applied = { ...filters };
  for (const { key } of missing) {
    clearFilter(applied, key);
  }
  return applied;
}

export function applicableState(
  state: ViewState,
  counts: FacetCounts,
): { state: ViewState; missing: UnavailableFilter[] } {
  const missing = findUnavailable(state.filters, counts);
  return {
    state: {
      ...state,
      filters: withoutUnavailable(state.filters, missing),
      metaphor: normaliseMetaphor(state.metaphor),
    },
    missing,
  };
}
