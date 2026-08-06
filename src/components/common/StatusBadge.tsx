import { cva } from "class-variance-authority";
import { AlertTriangle, Check, Circle, Minus, X } from "lucide-react";
import type { ComponentType } from "react";
import { HEALTH_SYMBOLS, type PrayerState } from "../../constants/status";
import type { MeetingState } from "../../types/meeting";
import type {
  OverallHealth,
  ProjectPriority,
  StaleStatus,
} from "../../types/project";
import { cn } from "../../utils/cn";

type IconComponent = ComponentType<{ size?: number; strokeWidth?: number }>;

export const HEALTH_TONES: Record<OverallHealth, string> = {
  boa: "bg-status-good-bg text-verde-claro",
  atencao: "bg-status-attention-bg text-status-attention-fg",
  critica: "bg-status-critical-bg text-telha",
  na: "bg-muted text-fg-subtle",
};

export const HEALTH_DOT_TONES: Record<OverallHealth, string> = {
  boa: "bg-status-good text-branco",
  atencao: "bg-status-attention text-branco",
  critica: "bg-status-critical text-branco",
  na: "bg-status-na text-verde opacity-60",
};

export const STALE_TONES: Record<StaleStatus, string> = {
  "em-dia": "bg-status-good-bg text-verde-claro",
  atencao: "bg-status-attention-bg text-status-attention-fg",
  critico: "bg-status-critical-bg text-telha",
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

export const HEALTH_ICONS: Record<OverallHealth, IconComponent> = {
  boa: Check,
  atencao: AlertTriangle,
  critica: X,
  na: Minus,
};

export const STALE_ICONS: Record<StaleStatus, IconComponent> = {
  "em-dia": Check,
  atencao: AlertTriangle,
  critico: X,
};

export const RHYTHM_ICONS: Record<MeetingState, IconComponent> = {
  done: Check,
  pending: Circle,
  overdue: AlertTriangle,
  new: Minus,
};

export const PRAYER_ICONS: Record<PrayerState, IconComponent> = {
  answered: Check,
};

const badgeBase =
  "inline-flex items-center gap-1 rounded-pill px-2.5 py-1.25 text-[11px] font-bold tracking-[0.04em] uppercase";

export const healthBadgeVariants = cva(badgeBase, {
  variants: { state: HEALTH_TONES },
});
export const staleBadgeVariants = cva(badgeBase, {
  variants: { state: STALE_TONES },
});
export const rhythmBadgeVariants = cva(badgeBase, {
  variants: { state: RHYTHM_TONES },
});
export const prayerBadgeVariants = cva(badgeBase, {
  variants: { state: PRAYER_TONES },
});

export const healthDotVariants = cva(
  "inline-flex size-4.5 items-center justify-center rounded-pill text-[9px] font-black",
  { variants: { state: HEALTH_DOT_TONES } },
);

export const priorityPinVariants = cva("size-2 rounded-pill", {
  variants: { priority: PRIORITY_TONES },
});

type StatusBadgeProps = { label: string; className?: string } & (
  | { kind: "health"; state: OverallHealth }
  | { kind: "stale"; state: StaleStatus }
  | { kind: "rhythm"; state: MeetingState }
  | { kind: "prayer"; state: PrayerState }
);

function resolve(props: StatusBadgeProps) {
  switch (props.kind) {
    case "health":
      return {
        tone: healthBadgeVariants({ state: props.state }),
        Icon: HEALTH_ICONS[props.state],
      };
    case "stale":
      return {
        tone: staleBadgeVariants({ state: props.state }),
        Icon: STALE_ICONS[props.state],
      };
    case "rhythm":
      return {
        tone: rhythmBadgeVariants({ state: props.state }),
        Icon: RHYTHM_ICONS[props.state],
      };
    case "prayer":
      return {
        tone: prayerBadgeVariants({ state: props.state }),
        Icon: PRAYER_ICONS[props.state],
      };
  }
}

export function StatusBadge(props: StatusBadgeProps) {
  const { tone, Icon } = resolve(props);
  return (
    <span className={cn(tone, props.className)}>
      <Icon size={11} strokeWidth={1.75} />
      {props.label}
    </span>
  );
}

export interface StatusDotProps {
  state: OverallHealth;
  label: string;
  className?: string;
}

export function StatusDot({ state, label, className }: StatusDotProps) {
  return (
    <span className={cn(healthDotVariants({ state }), className)}>
      <span aria-hidden>{HEALTH_SYMBOLS[state]}</span>
      <span className="sr-only">{label}</span>
    </span>
  );
}

export interface PriorityPinProps {
  priority: ProjectPriority;
  className?: string;
}

export function PriorityPin({ priority, className }: PriorityPinProps) {
  return (
    <span aria-hidden className={cn(priorityPinVariants({ priority }), className)} />
  );
}
