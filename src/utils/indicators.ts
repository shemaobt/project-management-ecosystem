import {
  DEFAULT_METAPHOR,
  type CardMetaphor,
} from "../constants/metaphors";
import { DEFAULT_SORT, type SortKey } from "../constants/sorting";
import { EMPTY_FILTERS, type ProjectFilters } from "../stores/filtersStore";
import type {
  PresetId,
  Project,
  ProjectStatus,
  StaleStatus,
} from "../types/project";
import type { ListFacets } from "../types/projectBrowse";
import { encodeViewToUrl, type ViewState } from "./filterSerialisation";
import { filterProjects } from "./search";

export type IndicatorId =
  | "languages"
  | "bases"
  | "inProgress"
  | "completed"
  | "urgent"
  | "noNews";

/**
 * What a click on the indicator opens, as one cell of the unfiltered list's counts: the
 * filter the link carries and the number the band shows are both read off this field, so
 * the two cannot name different things (OBT-590). `bases` opens nothing — the list has no
 * way to show every base.
 */
export type IndicatorTarget =
  | { kind: "all" }
  | { kind: "bases" }
  | { kind: "status"; status: ProjectStatus }
  | { kind: "preset"; preset: PresetId }
  | { kind: "stale"; stale: StaleStatus };

export interface IndicatorSpec {
  id: IndicatorId;
  labelKey: string;
  tailKey: string;
  accent: boolean;
  target: IndicatorTarget;
}

const PROJECTS_PATH = "/projetos";

export const INDICATORS: readonly IndicatorSpec[] = [
  {
    id: "languages",
    labelKey: "stat_total",
    tailKey: "stat_total_tail",
    accent: false,
    target: { kind: "all" },
  },
  {
    id: "bases",
    labelKey: "stat_teams",
    tailKey: "stat_teams_tail",
    accent: false,
    target: { kind: "bases" },
  },
  {
    id: "inProgress",
    labelKey: "stat_progress",
    tailKey: "stat_progress_tail",
    accent: false,
    target: { kind: "status", status: "em-andamento" },
  },
  {
    id: "completed",
    labelKey: "stat_completed",
    tailKey: "stat_completed_tail",
    accent: false,
    target: { kind: "status", status: "concluido" },
  },
  {
    id: "urgent",
    labelKey: "stat_urgent",
    tailKey: "stat_urgent_tail",
    accent: true,
    target: { kind: "preset", preset: "attention" },
  },
  {
    id: "noNews",
    labelKey: "stat_stale",
    tailKey: "stat_stale_tail",
    accent: true,
    target: { kind: "stale", stale: "atencao" },
  },
];

/** The filter the indicator's link carries — `null` for the one that is not a link. */
export function indicatorFilters(
  spec: IndicatorSpec,
): Partial<ProjectFilters> | null {
  const { target } = spec;
  switch (target.kind) {
    case "all":
      return {};
    case "bases":
      return null;
    case "status":
      return { status: target.status };
    case "stale":
      return { stale: target.stale };
    case "preset": {
      const filters: Partial<ProjectFilters> = {};
      filters[target.preset] = true;
      return filters;
    }
  }
}

export interface IndicatorViewPrefs {
  sort: SortKey;
  metaphor: CardMetaphor;
}

const DEFAULT_VIEW_PREFS: IndicatorViewPrefs = {
  sort: DEFAULT_SORT,
  metaphor: DEFAULT_METAPHOR,
};

export function indicatorView(
  spec: IndicatorSpec,
  prefs: IndicatorViewPrefs = DEFAULT_VIEW_PREFS,
): ViewState {
  return {
    filters: { ...EMPTY_FILTERS, ...indicatorFilters(spec) },
    search: "",
    sort: prefs.sort,
    metaphor: prefs.metaphor,
  };
}

export function indicatorHref(
  spec: IndicatorSpec,
  prefs: IndicatorViewPrefs = DEFAULT_VIEW_PREFS,
): string {
  return encodeViewToUrl(indicatorView(spec, prefs), PROJECTS_PATH);
}

/**
 * The fixture list's counts, taken in the browser the way the server takes them: one pass
 * with no filter. Against the server the band never comes here — the browse already answered
 * these numbers, off the progress history the cards do not carry (OBT-590).
 */
export function listFacets(
  projects: readonly Project[],
  now: Date = new Date(),
): ListFacets {
  const result = filterProjects(projects, EMPTY_FILTERS, "", now);
  return { counts: result.counts, matched: result.projects.length };
}

export function indicatorCount(spec: IndicatorSpec, facets: ListFacets): number {
  const { target } = spec;
  const { counts } = facets;
  switch (target.kind) {
    case "all":
      return facets.matched;
    case "bases":
      return Object.values(counts.team).filter((count) => count > 0).length;
    case "status":
      return counts.status[target.status] ?? 0;
    case "preset":
      return counts.preset[target.preset];
    case "stale":
      return counts.stale[target.stale];
  }
}
