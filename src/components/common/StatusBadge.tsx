import { cva } from "class-variance-authority";
import { AlertTriangle, Check, Circle, Minus, X } from "lucide-react";
import type { ComponentType } from "react";
import { useTranslation } from "react-i18next";
import {
  HEALTH_LABEL_KEYS,
  HEALTH_SYMBOLS,
  type PrayerState,
} from "../../constants/status";
import {
  HEALTH_DOT_TONES,
  HEALTH_TONES,
  PRAYER_TONES,
  PRIORITY_TONES,
  RHYTHM_TONES,
  STALE_TONES,
  circleControl,
  pillBase,
} from "../../styles";
import type { MeetingState } from "../../types/meeting";
import type {
  OverallHealth,
  ProjectPriority,
  StaleStatus,
} from "../../types/project";
import { cn } from "../../utils/cn";

type IconComponent = ComponentType<{ size?: number; strokeWidth?: number }>;

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

export const healthBadgeVariants = cva(pillBase, {
  variants: { state: HEALTH_TONES },
});
export const staleBadgeVariants = cva(pillBase, {
  variants: { state: STALE_TONES },
});
export const rhythmBadgeVariants = cva(pillBase, {
  variants: { state: RHYTHM_TONES },
});
export const prayerBadgeVariants = cva(pillBase, {
  variants: { state: PRAYER_TONES },
});

export const healthDotVariants = cva(
  `${circleControl} size-4.5 text-[9px] font-black`,
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
  const { t } = useTranslation();
  const spoken = `${label}: ${t(HEALTH_LABEL_KEYS[state])}`;
  return (
    <span
      title={spoken}
      className={cn(healthDotVariants({ state }), className)}
    >
      <span aria-hidden>{HEALTH_SYMBOLS[state]}</span>
      <span className="sr-only">{spoken}</span>
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
