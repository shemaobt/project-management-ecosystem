import type { HealthDimensionKey, HealthRating, PrayerVisibility } from "./project";

export type PastoralAnswer = "sim" | "nao";

export type PastoralWhen = "now" | "30d";

export interface AssessmentDraft {
  projectId: string;
  ratings: Record<HealthDimensionKey, HealthRating>;
  notes: Record<HealthDimensionKey, string>;
  assessor: string;
  date: string;
  overallNote: string;
  prayerRequest: string;
  prayerVisibility: PrayerVisibility;
  pastoral: PastoralAnswer;
  pastoralWhen: PastoralWhen;
  pastoralWho: string;
  savedAt: string;
}

export interface PastoralReason {
  dimension: HealthDimensionKey;
  rating: HealthRating;
}

export interface PastoralSuggestion {
  suggested: boolean;
  reasons: readonly PastoralReason[];
}
