import {
  DEFAULT_METAPHOR,
  type CardMetaphor,
} from "../constants/metaphors";
import { DEFAULT_SORT, type SortKey } from "../constants/sorting";
import { EMPTY_FILTERS, type ProjectFilters } from "../stores/filtersStore";
import type { Project } from "../types/project";
import { encodeViewToUrl, type ViewState } from "./filterSerialisation";
import { filterProjects } from "./search";

export type IndicatorId =
  | "languages"
  | "bases"
  | "inProgress"
  | "completed"
  | "urgent"
  | "noNews";

export interface IndicatorSpec {
  id: IndicatorId;
  labelKey: string;
  tailKey: string;
  accent: boolean;
  filters: Partial<ProjectFilters> | null;
}

const PROJECTS_PATH = "/projetos";

export const INDICATORS: readonly IndicatorSpec[] = [
  {
    id: "languages",
    labelKey: "stat_total",
    tailKey: "stat_total_tail",
    accent: false,
    filters: {},
  },
  {
    id: "bases",
    labelKey: "stat_teams",
    tailKey: "stat_teams_tail",
    accent: false,
    filters: null,
  },
  {
    id: "inProgress",
    labelKey: "stat_progress",
    tailKey: "stat_progress_tail",
    accent: false,
    filters: { status: "em-andamento" },
  },
  {
    id: "completed",
    labelKey: "stat_completed",
    tailKey: "stat_completed_tail",
    accent: false,
    filters: { status: "concluido" },
  },
  {
    id: "urgent",
    labelKey: "stat_urgent",
    tailKey: "stat_urgent_tail",
    accent: true,
    filters: { attention: true },
  },
  {
    id: "noNews",
    labelKey: "stat_stale",
    tailKey: "stat_stale_tail",
    accent: true,
    filters: { stale: "atencao" },
  },
];

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
    filters: { ...EMPTY_FILTERS, ...spec.filters },
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

function countBases(projects: readonly Project[]): number {
  const bases = new Set<string>();
  for (const project of projects) {
    if (project.team) bases.add(project.team);
  }
  return bases.size;
}

export function indicatorCount(
  spec: IndicatorSpec,
  projects: readonly Project[],
  now: Date = new Date(),
): number {
  if (spec.filters === null) return countBases(projects);
  return filterProjects(projects, indicatorView(spec).filters, "", now).projects
    .length;
}
