import type { MeetingState } from "../types/meeting";
import type { OverallHealth, StaleStatus } from "../types/project";

export const PRAYER_STATES = ["answered"] as const;
export type PrayerState = (typeof PRAYER_STATES)[number];

export const HEALTH_LABEL_KEYS: Record<OverallHealth, string> = {
  boa: "health_good",
  atencao: "health_attention",
  critica: "health_critical",
  na: "health_na",
};

export const STALE_LABEL_KEYS: Record<StaleStatus, string> = {
  "em-dia": "stale_uptodate",
  atencao: "stale_attention",
  critico: "stale_critical",
};

export const RHYTHM_LABEL_KEYS: Record<MeetingState, string> = {
  done: "ritmo_st_done",
  pending: "ritmo_st_pending",
  overdue: "ritmo_st_overdue",
  new: "ritmo_st_new",
};

export const PRAYER_LABEL_KEYS: Record<PrayerState, string> = {
  answered: "oracao_answered_tag",
};

export const HEALTH_SYMBOLS: Record<OverallHealth, string> = {
  boa: "✓",
  atencao: "!",
  critica: "×",
  na: "–",
};
