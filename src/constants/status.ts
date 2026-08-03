export const HEALTH_STATES = ["boa", "atencao", "critica", "na"] as const;
export type HealthState = (typeof HEALTH_STATES)[number];

export const STALE_STATES = ["em-dia", "atencao", "critico"] as const;
export type StaleState = (typeof STALE_STATES)[number];

export const RHYTHM_STATES = ["done", "pending", "overdue", "new"] as const;
export type RhythmState = (typeof RHYTHM_STATES)[number];

export const PRAYER_STATES = ["answered"] as const;
export type PrayerState = (typeof PRAYER_STATES)[number];

export const PRIORITY_STATES = [
  "critical",
  "warning",
  "completed",
  "canceled",
  "paused",
  "planned",
  "unknown",
  "default",
] as const;
export type PriorityState = (typeof PRIORITY_STATES)[number];

export const HEALTH_LABEL_KEYS: Record<HealthState, string> = {
  boa: "health_good",
  atencao: "health_attention",
  critica: "health_critical",
  na: "health_na",
};

export const STALE_LABEL_KEYS: Record<StaleState, string> = {
  "em-dia": "stale_uptodate",
  atencao: "stale_attention",
  critico: "stale_critical",
};

export const RHYTHM_LABEL_KEYS: Record<RhythmState, string> = {
  done: "ritmo_st_done",
  pending: "ritmo_st_pending",
  overdue: "ritmo_st_overdue",
  new: "ritmo_st_new",
};

export const PRAYER_LABEL_KEYS: Record<PrayerState, string> = {
  answered: "oracao_answered_tag",
};

export const HEALTH_SYMBOLS: Record<HealthState, string> = {
  boa: "✓",
  atencao: "!",
  critica: "×",
  na: "–",
};
