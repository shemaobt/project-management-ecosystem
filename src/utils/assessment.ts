import { HEALTH_DIMENSIONS, type AssessedProject } from "../constants/health";
import { DEFAULT_PRAYER_VISIBILITY } from "../constants/prayer";
import type {
  AssessmentDraft,
  PastoralReason,
  PastoralSuggestion,
} from "../types/assessment";
import type {
  HealthAssessment,
  HealthDimensionKey,
  HealthRating,
  OverallHealth,
  Project,
} from "../types/project";
import { toLocalIsoDate } from "./format";
import { getOverallHealth, overallOfEntry, recordAssessment } from "./health";

const EMPTY_RATINGS: Record<HealthDimensionKey, HealthRating> = {
  emotional: "",
  relational: "",
  spiritual: "",
  physical: "",
};

const EMPTY_NOTES: Record<HealthDimensionKey, string> = {
  emotional: "",
  relational: "",
  spiritual: "",
  physical: "",
};

export function emptyDraft(
  projectId: string,
  now: Date = new Date(),
): AssessmentDraft {
  const date = toLocalIsoDate(now);
  return {
    projectId,
    ratings: { ...EMPTY_RATINGS },
    notes: { ...EMPTY_NOTES },
    assessor: "",
    date,
    overallNote: "",
    prayerRequest: "",
    prayerVisibility: DEFAULT_PRAYER_VISIBILITY,
    pastoral: "nao",
    pastoralWhen: "now",
    pastoralWho: "",
    savedAt: date,
  };
}

export function assessedCount(draft: AssessmentDraft): number {
  return HEALTH_DIMENSIONS.filter(
    (dimension) => draft.ratings[dimension.key] !== "",
  ).length;
}

export function asAssessedProject(draft: AssessmentDraft): AssessedProject {
  const assessed: AssessedProject = {};
  for (const dimension of HEALTH_DIMENSIONS) {
    assessed[dimension.field] = draft.ratings[dimension.key];
  }
  return assessed;
}

export function overallOf(draft: AssessmentDraft): OverallHealth {
  return getOverallHealth(asAssessedProject(draft));
}

export function pastoralSuggestion(draft: AssessmentDraft): PastoralSuggestion {
  const reasons: PastoralReason[] = HEALTH_DIMENSIONS.filter((dimension) => {
    const rating = draft.ratings[dimension.key];
    return rating === "critica" || rating === "atencao";
  }).map((dimension) => ({
    dimension: dimension.key,
    rating: draft.ratings[dimension.key],
  }));

  return { suggested: reasons.length > 0, reasons };
}

export function compileNotes(
  draft: AssessmentDraft,
  label: (key: string) => string,
): string {
  const parts = HEALTH_DIMENSIONS.filter(
    (dimension) => draft.notes[dimension.key].trim() !== "",
  ).map(
    (dimension) =>
      `${label(dimension.labelKey)}: ${draft.notes[dimension.key].trim()}`,
  );

  if (draft.overallNote.trim() !== "") parts.push(draft.overallNote.trim());
  return parts.join("\n\n");
}

export interface AssessmentEntryMeta {
  author?: string;
  questionSetVersion?: number;
}

/**
 * `meta` exists for the fixture double standing in for BE-07 (INT-04): the live wizard
 * never calls this directly, it posts to `healthAssessmentsAPI.submit` and reads the
 * server's own record back.
 */
export function applyAssessment(
  project: Project,
  draft: AssessmentDraft,
  label: (key: string) => string,
  meta: AssessmentEntryMeta = {},
): Project {
  const raised = draft.prayerRequest.trim();

  return {
    ...recordAssessment(project, toAssessment(draft, label, meta)),
    needsPastoralIntervention: draft.pastoral,
    pastoralInterventionName: draft.pastoralWho,
    pastoralInterventionWhen: draft.pastoralWhen,
    ...(raised === ""
      ? {}
      : { prayerRequests: raised, prayerVisibility: draft.prayerVisibility }),
  };
}

/**
 * `meta` is only ever supplied by a caller standing in for the server — the fixture
 * double (INT-04 · BE-07) — never by the live wizard, which reads `author` and
 * `questionSetVersion` back from the response instead of guessing them. `overall` is
 * always computed: it is a fact about the four ratings on hand, not a server opinion.
 */
export function toAssessment(
  draft: AssessmentDraft,
  label: (key: string) => string,
  meta: AssessmentEntryMeta = {},
): HealthAssessment {
  const entry = {
    date: draft.date,
    assessor: draft.assessor.trim(),
    emotional: draft.ratings.emotional,
    relational: draft.ratings.relational,
    spiritual: draft.ratings.spiritual,
    physical: draft.ratings.physical,
    notes: compileNotes(draft, label),
    dimensionNotes: { ...draft.notes },
    ...meta,
  };
  return { ...entry, overall: overallOfEntry(entry) };
}
