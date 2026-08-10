import { EMPTY_FILTERS, type ProjectFilters } from "../../../../stores/filtersStore";
import type { Project } from "../../../../types/project";
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

export const FILTER_LABEL_KEYS: Record<(typeof FACET_FILTERS)[number], string> =
  {
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
  };

export interface UnavailableFilter {
  key: (typeof FACET_FILTERS)[number];
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
    const group = counts[key] as Record<string, number | undefined>;
    if (!group[value]) missing.push({ key, value });
  }
  return missing;
}

export function withoutUnavailable(
  filters: ProjectFilters,
  missing: readonly UnavailableFilter[],
): ProjectFilters {
  const applied = { ...filters };
  for (const { key } of missing) {
    Object.assign(applied, { [key]: EMPTY_FILTERS[key] });
  }
  return applied;
}

export function applicableState(
  state: ViewState,
  counts: FacetCounts,
): { state: ViewState; missing: UnavailableFilter[] } {
  const missing = findUnavailable(state.filters, counts);
  return {
    state: { ...state, filters: withoutUnavailable(state.filters, missing) },
    missing,
  };
}
