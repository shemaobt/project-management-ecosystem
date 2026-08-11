import { DEFAULT_SORT, isSortKey, type SortKey } from "../constants/sorting";
import {
  EMPTY_FILTERS,
  PROGRESS_RANGES,
  YES_NO_VALUES,
  type ProjectFilters,
} from "../stores/filtersStore";
import type { CardMetaphor } from "../stores/prefsStore";
import {
  FINANCIAL_RESOURCES,
  NEED_CATEGORIES,
  OBJECTIVES,
  OVERALL_HEALTH_STATES,
  PROJECT_STATUSES,
  REGIONS,
  STALE_STATUSES,
  TRANSLATION_TYPES,
} from "../constants";

export interface ViewState {
  filters: ProjectFilters;
  search: string;
  sort: SortKey;
  metaphor: CardMetaphor;
}

const METAPHORS: readonly CardMetaphor[] = ["atlas", "diario", "coral"];

const PRESET_KEYS = [
  "attention",
  "prayer",
  "celebrate",
  "recent",
] as const satisfies readonly (keyof ProjectFilters)[];

const FREE_TEXT_KEYS = [
  "team",
  "country",
  "vitality",
] as const satisfies readonly (keyof ProjectFilters)[];

const ENUM_KEYS = [
  "objective",
  "status",
  "health",
  "financial",
  "stale",
  "continent",
  "translationType",
  "eten",
  "sensitive",
  "progressRange",
  "needCategory",
  "hasMedia",
] as const satisfies readonly (keyof ProjectFilters)[];

type EnumKey = (typeof ENUM_KEYS)[number];

const ENUM_VALUES: {
  [K in EnumKey]: readonly NonNullable<ProjectFilters[K]>[];
} = {
  objective: OBJECTIVES,
  status: PROJECT_STATUSES,
  health: OVERALL_HEALTH_STATES,
  financial: FINANCIAL_RESOURCES,
  stale: STALE_STATUSES,
  continent: REGIONS.map((region) => region.key),
  translationType: TRANSLATION_TYPES,
  eten: YES_NO_VALUES,
  sensitive: YES_NO_VALUES,
  progressRange: PROGRESS_RANGES,
  needCategory: NEED_CATEGORIES.map((category) => category.id),
  hasMedia: YES_NO_VALUES,
};

function applyEnum<K extends EnumKey>(
  filters: ProjectFilters,
  key: K,
  raw: string | null,
): void {
  const match = ENUM_VALUES[key].find((option) => option === raw);
  if (match) filters[key] = match;
}

export const SEARCH_PARAM = "q";
export const SORT_PARAM = "sort";
export const VIEW_PARAM = "view";

export function encodeView(state: ViewState): URLSearchParams {
  const params = new URLSearchParams();

  for (const key of FREE_TEXT_KEYS) {
    const value = state.filters[key];
    if (value) params.set(key, value);
  }

  for (const key of ENUM_KEYS) {
    const value = state.filters[key];
    if (value) params.set(key, value);
  }

  const presets = PRESET_KEYS.filter((key) => state.filters[key]);
  if (presets.length > 0) params.set("presets", presets.join(","));

  const search = state.search.trim();
  if (search) params.set(SEARCH_PARAM, search);
  if (state.sort !== DEFAULT_SORT) params.set(SORT_PARAM, state.sort);
  if (state.metaphor !== "atlas") params.set(VIEW_PARAM, state.metaphor);

  return params;
}

export function encodeViewToUrl(state: ViewState, origin: string): string {
  const params = encodeView(state).toString();
  return params ? `${origin}?${params}` : origin;
}

export function decodeView(params: URLSearchParams): ViewState {
  const filters: ProjectFilters = { ...EMPTY_FILTERS };

  for (const key of FREE_TEXT_KEYS) {
    const value = params.get(key)?.trim();
    if (value) filters[key] = value;
  }

  for (const key of ENUM_KEYS) {
    applyEnum(filters, key, params.get(key));
  }

  const presets = (params.get("presets") ?? "").split(",");
  for (const key of PRESET_KEYS) {
    if (presets.includes(key)) filters[key] = true;
  }

  const sort = params.get(SORT_PARAM);
  const metaphor = params.get(VIEW_PARAM);

  return {
    filters,
    search: params.get(SEARCH_PARAM)?.trim() ?? "",
    sort: sort && isSortKey(sort) ? sort : DEFAULT_SORT,
    metaphor: METAPHORS.find((option) => option === metaphor) ?? "atlas",
  };
}

export function isEmptyView(state: ViewState): boolean {
  return encodeView(state).toString() === "";
}
