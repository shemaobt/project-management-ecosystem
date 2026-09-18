import type { PrayerState } from "../constants/status";
import type { ReportingState } from "../types/forms";
import type { MeetingState } from "../types/meeting";
import type {
  OverallHealth,
  ProjectPriority,
  StaleStatus,
} from "../types/project";

export const pillBase: string =
  "inline-flex items-center gap-1 rounded-pill px-2.5 py-1.25 text-tag font-bold tracking-button uppercase";

export const goodTone: string = "bg-status-good-bg text-status-good-ink";
export const attentionTone: string =
  "bg-status-attention-bg text-status-attention-ink";
export const criticalTone: string = "bg-status-critical-bg text-accent-press";

/** A tag de *objetivo* no cartão do Atlas. Carrega hoje os mesmos valores de
 *  `HEALTH_TONES.boa` — é a mesma família do verde-claro, e o par mede 5.69:1
 *  sobre a superfície do cartão —, mas **não é tom de saúde**: o alfinete de
 *  saúde fica na mesma linha, e no dia em que o tom de saúde mudar esta tag não
 *  muda junto. Achado do little-joao na PR #55.
 *  O par anterior, `bg-verde-claro/18 text-verde-claro`, era wash composto e
 *  reprovava; `bg-verde-claro/18 text-verde-claro-ink` também (4.19). */
export const objectiveTagTone: string =
  "bg-status-good-bg text-status-good-ink";

export const HEALTH_TONES: Record<OverallHealth, string> = {
  boa: goodTone,
  atencao: attentionTone,
  critica: criticalTone,
  na: "bg-muted text-fg-muted",
};

export const HEALTH_DOT_TONES: Record<OverallHealth, string> = {
  boa: "bg-verde-claro-ink text-on-dark",
  atencao: "bg-status-attention-fg text-on-dark",
  critica: "bg-status-critical text-on-dark",
  na: "bg-status-na text-on-light",
};

export const STALE_TONES: Record<StaleStatus, string> = {
  "em-dia": goodTone,
  atencao: attentionTone,
  critico: criticalTone,
};

export const RHYTHM_TONES: Record<MeetingState, string> = {
  done: "bg-rhythm-done-bg text-rhythm-done-fg",
  pending: "bg-rhythm-pending-bg text-rhythm-pending-fg",
  overdue: "bg-rhythm-overdue-bg text-rhythm-overdue-fg",
  new: "bg-rhythm-new-bg text-rhythm-new-fg",
};

export const PRAYER_TONES: Record<PrayerState, string> = {
  answered: "bg-answered-bg text-answered-fg",
};

export const REPORTING_TONES: Record<ReportingState, string> = {
  reported: "text-verde-claro-ink",
  awaiting: "text-fg-muted",
  never: "text-telha",
};

export const PRIORITY_TONES: Record<ProjectPriority, string> = {
  critical: "bg-status-critical",
  warning: "bg-status-attention",
  completed: "bg-status-good",
  canceled: "bg-status-na",
  paused: "bg-status-na",
  planned: "bg-azul",
  unknown: "bg-status-na",
  default: "bg-status-na",
};
