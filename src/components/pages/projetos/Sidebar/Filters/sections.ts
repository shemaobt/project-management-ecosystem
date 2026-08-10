import {
  FINANCIAL_RESOURCES,
  HEALTH_LEVELS,
  NEED_CATEGORIES,
  OBJECTIVES,
  PROJECT_STATUSES,
  STALE_STATUSES,
  TRANSLATION_TYPES,
  VITALITY_SCALE,
} from "../../../../../constants";
import type { ProgressRange } from "../../../../../stores/filtersStore";
import {
  EMPTY_FILTERS,
  PROGRESS_RANGES,
  YES_NO_VALUES,
} from "../../../../../stores/filtersStore";
import type {
  HealthLevel,
  Project,
  ProjectStatus,
  StaleStatus,
} from "../../../../../types/project";
import type { FacetCounts, FacetGroup } from "../../../../../utils/search";
import { filterProjects } from "../../../../../utils/search";

export type FilterSectionId = Exclude<FacetGroup, "continent">;

export type FacetOptionValue<Id extends FilterSectionId> =
  Id extends FilterSectionId ? Extract<keyof FacetCounts[Id], string> : never;

export type FilterSectionConfig = {
  [Id in FilterSectionId]: {
    id: Id;
    titleKey: string;
    criticalValues?: readonly FacetOptionValue<Id>[];
  };
}[FilterSectionId];

export const PRIMARY_SECTIONS: readonly FilterSectionConfig[] = [
  { id: "status", titleKey: "sb_status", criticalValues: ["cancelado"] },
  { id: "team", titleKey: "sb_team" },
  { id: "health", titleKey: "sb_health", criticalValues: ["critica"] },
];

export const ADVANCED_SECTIONS: readonly FilterSectionConfig[] = [
  { id: "country", titleKey: "sb_country" },
  { id: "objective", titleKey: "sb_objective" },
  { id: "translationType", titleKey: "sb_translation_type" },
  { id: "eten", titleKey: "sb_eten" },
  { id: "sensitive", titleKey: "sb_sensitive" },
  { id: "financial", titleKey: "sb_financial" },
  { id: "progressRange", titleKey: "sb_progress_range" },
  { id: "vitality", titleKey: "sb_vitality" },
  { id: "needCategory", titleKey: "sb_needs_section" },
  { id: "hasMedia", titleKey: "sb_media" },
  { id: "stale", titleKey: "sb_stale", criticalValues: ["critico"] },
];

export interface FilterOptionSpec<V extends string = string> {
  value: V;
  labelKey: string | null;
}

export type FilterOptionsById = {
  [Id in FilterSectionId]: FilterOptionSpec<FacetOptionValue<Id>>[];
};

const STATUS_LABEL_KEYS: Record<ProjectStatus, string> = {
  "nao-iniciado": "status_not_started",
  "em-andamento": "status_in_progress",
  final: "status_final",
  concluido: "status_completed",
  pausado: "status_paused",
  cancelado: "status_canceled",
  planejado: "status_planned",
  desconhecido: "status_unknown",
};

const HEALTH_LABEL_KEYS: Record<HealthLevel, string> = {
  boa: "health_good",
  atencao: "health_attention",
  critica: "health_critical",
};

const STALE_LABEL_KEYS: Record<StaleStatus, string> = {
  "em-dia": "stale_uptodate",
  atencao: "stale_attention",
  critico: "stale_critical",
};

const RANGE_LABEL_KEYS: Record<ProgressRange, string> = {
  "0-25": "range_0_25",
  "25-50": "range_25_50",
  "50-75": "range_50_75",
  "75-100": "range_75_100",
};

function fromVocabulary<V extends string>(
  values: readonly V[],
  labelKeys?: Partial<Record<V, string>>,
): FilterOptionSpec<V>[] {
  return values.map((value) => ({
    value,
    labelKey: labelKeys?.[value] ?? null,
  }));
}

function fromDataset(counts: Record<string, number>): FilterOptionSpec[] {
  return Object.keys(counts)
    .sort((a, b) => a.localeCompare(b))
    .map((value) => ({ value, labelKey: null }));
}

function yesNo(
  yesKey: string,
  noKey: string,
): FilterOptionSpec<"yes" | "no">[] {
  return YES_NO_VALUES.map((value) => ({
    value,
    labelKey: value === "yes" ? yesKey : noKey,
  }));
}

function sortedByCount<V extends string>(
  specs: FilterOptionSpec<V>[],
  counts: Partial<Record<V, number>>,
): FilterOptionSpec<V>[] {
  return [...specs].sort(
    (a, b) => (counts[b.value] ?? 0) - (counts[a.value] ?? 0),
  );
}

export function buildFilterOptions(
  projects: readonly Project[],
  now: Date = new Date(),
): FilterOptionsById {
  const baseline = filterProjects(projects, EMPTY_FILTERS, "", now).counts;
  return {
    status: sortedByCount(
      fromVocabulary(PROJECT_STATUSES, STATUS_LABEL_KEYS),
      baseline.status,
    ),
    team: sortedByCount(fromDataset(baseline.team), baseline.team),
    health: sortedByCount(
      fromVocabulary(HEALTH_LEVELS, HEALTH_LABEL_KEYS),
      baseline.health,
    ),
    country: sortedByCount(fromDataset(baseline.country), baseline.country),
    objective: sortedByCount(fromVocabulary(OBJECTIVES), baseline.objective),
    translationType: sortedByCount(
      fromVocabulary(TRANSLATION_TYPES),
      baseline.translationType,
    ),
    eten: yesNo("bool_yes", "bool_no"),
    sensitive: yesNo("sensitive_yes", "sensitive_no"),
    financial: sortedByCount(
      fromVocabulary(FINANCIAL_RESOURCES),
      baseline.financial,
    ),
    progressRange: PROGRESS_RANGES.map((value) => ({
      value,
      labelKey: RANGE_LABEL_KEYS[value],
    })),
    vitality: [...VITALITY_SCALE],
    needCategory: sortedByCount(
      NEED_CATEGORIES.map(({ id, labelKey }) => ({ value: id, labelKey })),
      baseline.needCategory,
    ),
    hasMedia: yesNo("media_has", "media_none"),
    stale: sortedByCount(
      fromVocabulary(STALE_STATUSES, STALE_LABEL_KEYS),
      baseline.stale,
    ),
  };
}

export function getOptionCount<Id extends FilterSectionId>(
  counts: FacetCounts,
  section: Id,
  value: FacetOptionValue<Id>,
): number {
  const group = counts[section] as Partial<
    Record<FacetOptionValue<Id>, number>
  >;
  return group[value] ?? 0;
}

export type SectionOptionState<Id extends FilterSectionId = FilterSectionId> =
  FilterOptionSpec<FacetOptionValue<Id>> & {
    count: number;
    critical: boolean;
    locked: boolean;
  };

export function resolveSectionOptions<Id extends FilterSectionId>(
  section: FilterSectionConfig & { id: Id },
  options: FilterOptionsById,
  counts: FacetCounts,
  activeValue: string | null,
): SectionOptionState<Id>[] {
  const criticalValues: readonly string[] = section.criticalValues ?? [];
  return options[section.id].map((spec) => {
    const count = getOptionCount(counts, section.id, spec.value);
    return {
      ...spec,
      count,
      critical: criticalValues.includes(spec.value),
      locked: count === 0 && activeValue !== spec.value,
    };
  });
}
