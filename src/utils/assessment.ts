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
import { getOverallHealth, recordAssessment } from "./health";

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

export function applyAssessment(
  project: Project,
  draft: AssessmentDraft,
  label: (key: string) => string,
): Project {
  const raised = draft.prayerRequest.trim();

  return {
    ...recordAssessment(project, toAssessment(draft, label)),
    needsPastoralIntervention: draft.pastoral,
    pastoralInterventionName: draft.pastoralWho,
    pastoralInterventionWhen: draft.pastoralWhen,
    ...(raised === ""
      ? {}
      : { prayerRequests: raised, prayerVisibility: draft.prayerVisibility }),
  };
}

export function toAssessment(
  draft: AssessmentDraft,
  label: (key: string) => string,
): HealthAssessment {
  return {
    date: draft.date,
    assessor: draft.assessor.trim(),
    emotional: draft.ratings.emotional,
    relational: draft.ratings.relational,
    spiritual: draft.ratings.spiritual,
    physical: draft.ratings.physical,
    notes: compileNotes(draft, label),
    dimensionNotes: { ...draft.notes },
  };
}
