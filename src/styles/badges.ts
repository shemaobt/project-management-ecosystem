import type {
  HealthState,
  PrayerState,
  PriorityState,
  RhythmState,
  StaleState,
} from "../constants/status";

export const pillBase: string =
  "inline-flex items-center gap-1 rounded-pill px-2.5 py-1.25 text-tag font-bold tracking-button uppercase";

export const goodTone: string = "bg-status-good-bg text-verde-claro";
export const attentionTone: string =
  "bg-status-attention-bg text-status-attention-fg";
export const criticalTone: string = "bg-status-critical-bg text-telha";

export const HEALTH_TONES: Record<HealthState, string> = {
  boa: goodTone,
  atencao: attentionTone,
  critica: criticalTone,
  na: "bg-muted text-fg-subtle",
};

export const HEALTH_DOT_TONES: Record<HealthState, string> = {
  boa: "bg-status-good text-branco",
  atencao: "bg-status-attention text-branco",
  critica: "bg-status-critical text-branco",
  na: "bg-status-na text-verde opacity-60",
};

export const STALE_TONES: Record<StaleState, string> = {
  "em-dia": goodTone,
  atencao: attentionTone,
  critico: criticalTone,
};

export const RHYTHM_TONES: Record<RhythmState, string> = {
  done: "bg-rhythm-done-bg text-rhythm-done-fg",
  pending: "bg-rhythm-pending-bg text-rhythm-pending-fg",
  overdue: "bg-rhythm-overdue-bg text-rhythm-overdue-fg",
  new: "bg-rhythm-new-bg text-rhythm-new-fg",
};

export const PRAYER_TONES: Record<PrayerState, string> = {
  answered: "bg-answered-bg text-answered-fg",
};

export const PRIORITY_TONES: Record<PriorityState, string> = {
  critical: "bg-status-critical",
  warning: "bg-status-attention",
  completed: "bg-status-good",
  canceled: "bg-status-na",
  paused: "bg-status-na",
  planned: "bg-azul",
  unknown: "bg-status-na",
  default: "bg-status-na",
};
