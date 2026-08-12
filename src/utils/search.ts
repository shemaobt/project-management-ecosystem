import type {
  ProjectFilters,
  ProgressRange,
  YesNoFilter,
} from "../stores/filtersStore";
import { PROGRESS_RANGES } from "../stores/filtersStore";
import type {
  FinancialResource,
  NeedCategory,
  Objective,
  OverallHealth,
  PresetId,
  Project,
  ProjectStatus,
  StaleStatus,
  TranslationType,
} from "../types/project";
import type { RegionKey } from "../types/region";
import { getOverallHealth } from "./health";
import { hasPhotoContent, hasVideoContent } from "./media";
import { matchesPreset } from "./presets";
import { getProgress, getProjectStatus } from "./progress";
import { getStaleStatus } from "./recency";
import { getCountry, getRegion } from "./region";

const APOSTROPHES = /[‘’ʼ]/g;

export function normalizeSearchText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(APOSTROPHES, "'")
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function searchHaystack(project: Project): string {
  return [project.languageName, project.team, project.ywamBase, project.partnerOrg]
    .filter(Boolean)
    .join(" ");
}

export function matchesSearch(project: Project, query: string): boolean {
  const needle = normalizeSearchText(query.trim());
  if (!needle) return true;
  return normalizeSearchText(searchHaystack(project)).includes(needle);
}

export type FacetGroup =
  | "status"
  | "team"
  | "health"
  | "objective"
  | "financial"
  | "stale"
  | "country"
  | "continent"
  | "vitality"
  | "translationType"
  | "needCategory"
  | "eten"
  | "sensitive"
  | "progressRange"
  | "hasMedia";

const FACET_GROUPS: readonly FacetGroup[] = [
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
];

export interface FacetCounts {
  status: Partial<Record<ProjectStatus, number>>;
  team: Record<string, number>;
  health: Record<OverallHealth, number>;
  objective: Partial<Record<Objective, number>>;
  financial: Partial<Record<FinancialResource, number>>;
  stale: Record<StaleStatus, number>;
  country: Record<string, number>;
  continent: Partial<Record<RegionKey, number>>;
  vitality: Record<string, number>;
  translationType: Partial<Record<TranslationType, number>>;
  needCategory: Partial<Record<NeedCategory, number>>;
  eten: Record<YesNoFilter, number>;
  sensitive: Record<YesNoFilter, number>;
  progressRange: Record<ProgressRange, number>;
  hasMedia: Record<YesNoFilter, number>;
  preset: Record<PresetId, number>;
  groupAll: Record<FacetGroup, number>;
}

export interface ProjectFilterResult {
  projects: Project[];
  counts: FacetCounts;
  total: number;
}

type FilterGroup = keyof ProjectFilters | "search";

const FILTER_GROUPS: readonly FilterGroup[] = [
  "search",
  "team",
  "objective",
  "status",
  "health",
  "financial",
  "stale",
  "country",
  "continent",
  "vitality",
  "translationType",
  "eten",
  "sensitive",
  "progressRange",
  "needCategory",
  "hasMedia",
  "attention",
  "prayer",
  "celebrate",
  "recent",
];

const PRESET_IDS: readonly PresetId[] = [
  "attention",
  "prayer",
  "celebrate",
  "recent",
];

function inProgressRange(project: Project, range: ProgressRange): boolean {
  const progress = getProgress(project);
  const [low, high] = range.split("-").map(Number);
  return progress >= low && progress <= high;
}

function hasAnyMedia(project: Project): boolean {
  const hasPhotos = (project.mediaPhotos ?? []).some(hasPhotoContent);
  const hasVideos = (project.mediaVideos ?? []).some(hasVideoContent);
  return hasPhotos || hasVideos;
}

function emptyCounts(): FacetCounts {
  return {
    status: {},
    team: {},
    health: { boa: 0, atencao: 0, critica: 0, na: 0 },
    objective: {},
    financial: {},
    stale: { "em-dia": 0, atencao: 0, critico: 0 },
    country: {},
    continent: {},
    vitality: {},
    translationType: {},
    needCategory: {},
    eten: { yes: 0, no: 0 },
    sensitive: { yes: 0, no: 0 },
    progressRange: { "0-25": 0, "25-50": 0, "50-75": 0, "75-100": 0 },
    hasMedia: { yes: 0, no: 0 },
    preset: { attention: 0, prayer: 0, celebrate: 0, recent: 0 },
    groupAll: Object.fromEntries(
      FACET_GROUPS.map((group) => [group, 0]),
    ) as Record<FacetGroup, number>,
  };
}

export function filterProjects(
  projects: readonly Project[],
  filters: ProjectFilters,
  search: string,
  now: Date = new Date(),
): ProjectFilterResult {
  const needle = normalizeSearchText(search.trim());
  const counts = emptyCounts();
  const visible: Project[] = [];

  for (const project of projects) {
    const status = getProjectStatus(project);
    const health = getOverallHealth(project);
    const stale = getStaleStatus(project, now);
    const country = getCountry(project);
    const region = getRegion(project);
    const presetMatch: Record<PresetId, boolean> = {
      attention: matchesPreset(project, "attention", now),
      prayer: matchesPreset(project, "prayer", now),
      celebrate: matchesPreset(project, "celebrate", now),
      recent: matchesPreset(project, "recent", now),
    };

    const passes: Record<FilterGroup, boolean> = {
      search:
        !needle || normalizeSearchText(searchHaystack(project)).includes(needle),
      team: !filters.team || project.team === filters.team,
      objective:
        !filters.objective || project.objective.includes(filters.objective),
      status: !filters.status || status === filters.status,
      health: !filters.health || health === filters.health,
      financial:
        !filters.financial ||
        project.financialResources.includes(filters.financial),
      stale: !filters.stale || stale === filters.stale,
      country: !filters.country || country === filters.country,
      continent: !filters.continent || region === filters.continent,
      vitality:
        !filters.vitality || project.vitalityStatus === filters.vitality,
      translationType:
        !filters.translationType ||
        project.translationType.includes(filters.translationType),
      eten:
        !filters.eten || (filters.eten === "yes") === Boolean(project.inETEN),
      sensitive:
        !filters.sensitive ||
        (filters.sensitive === "yes") === Boolean(project.sensitiveCountry),
      progressRange:
        !filters.progressRange ||
        inProgressRange(project, filters.progressRange),
      needCategory:
        !filters.needCategory ||
        project.needsItems.some(
          (need) => need.category === filters.needCategory,
        ),
      hasMedia:
        !filters.hasMedia ||
        (filters.hasMedia === "yes") === hasAnyMedia(project),
      attention: !filters.attention || presetMatch.attention,
      prayer: !filters.prayer || presetMatch.prayer,
      celebrate: !filters.celebrate || presetMatch.celebrate,
      recent: !filters.recent || presetMatch.recent,
    };

    let failCount = 0;
    let failedGroup: FilterGroup | null = null;
    for (const group of FILTER_GROUPS) {
      if (!passes[group]) {
        failCount += 1;
        if (failCount > 1) break;
        failedGroup = group;
      }
    }
    if (failCount > 1) continue;

    if (failCount === 0) visible.push(project);

    const countsFor = (group: FilterGroup): boolean =>
      failCount === 0 || failedGroup === group;

    if (countsFor("status")) {
      counts.status[status] = (counts.status[status] ?? 0) + 1;
    }
    if (countsFor("team") && project.team) {
      counts.team[project.team] = (counts.team[project.team] ?? 0) + 1;
    }
    if (countsFor("health")) {
      counts.health[health] += 1;
    }
    if (countsFor("objective")) {
      for (const objective of new Set(project.objective)) {
        counts.objective[objective] = (counts.objective[objective] ?? 0) + 1;
      }
    }
    if (countsFor("financial")) {
      for (const resource of new Set(project.financialResources)) {
        counts.financial[resource] = (counts.financial[resource] ?? 0) + 1;
      }
    }
    if (countsFor("stale") && stale) {
      counts.stale[stale] += 1;
    }
    if (countsFor("country") && country) {
      counts.country[country] = (counts.country[country] ?? 0) + 1;
    }
    if (countsFor("continent")) {
      counts.continent[region] = (counts.continent[region] ?? 0) + 1;
    }
    if (countsFor("vitality") && project.vitalityStatus) {
      counts.vitality[project.vitalityStatus] =
        (counts.vitality[project.vitalityStatus] ?? 0) + 1;
    }
    if (countsFor("translationType")) {
      for (const type of new Set(project.translationType)) {
        counts.translationType[type] = (counts.translationType[type] ?? 0) + 1;
      }
    }
    if (countsFor("needCategory")) {
      const needCategories = new Set<NeedCategory>();
      for (const need of project.needsItems) {
        if (need.category) needCategories.add(need.category);
      }
      for (const category of needCategories) {
        counts.needCategory[category] =
          (counts.needCategory[category] ?? 0) + 1;
      }
    }
    if (countsFor("eten")) {
      counts.eten[project.inETEN ? "yes" : "no"] += 1;
    }
    if (countsFor("sensitive")) {
      counts.sensitive[project.sensitiveCountry ? "yes" : "no"] += 1;
    }
    if (countsFor("progressRange")) {
      for (const range of PROGRESS_RANGES) {
        if (inProgressRange(project, range)) {
          counts.progressRange[range] += 1;
        }
      }
    }
    if (countsFor("hasMedia")) {
      counts.hasMedia[hasAnyMedia(project) ? "yes" : "no"] += 1;
    }
    for (const preset of PRESET_IDS) {
      if (countsFor(preset) && presetMatch[preset]) {
        counts.preset[preset] += 1;
      }
    }
    for (const group of FACET_GROUPS) {
      if (countsFor(group)) {
        counts.groupAll[group] += 1;
      }
    }
  }

  return { projects: visible, counts, total: projects.length };
}
