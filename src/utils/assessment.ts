import { HEALTH_DIMENSIONS } from "../constants/health";
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
} from "../types/project";
import { toLocalIsoDate } from "./format";

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

export function overallOf(draft: AssessmentDraft): OverallHealth {
  const rated = HEALTH_DIMENSIONS.map(
    (dimension) => draft.ratings[dimension.key],
  ).filter((rating): rating is Exclude<HealthRating, ""> => rating !== "");

  if (rated.length === 0) return "na";
  if (rated.includes("critica")) return "critica";
  if (rated.includes("atencao")) return "atencao";
  return "boa";
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
