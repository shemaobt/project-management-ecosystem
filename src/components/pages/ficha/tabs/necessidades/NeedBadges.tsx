import { useTranslation } from "react-i18next";
import {
  NEED_STATUS_LABEL_KEYS,
  NEED_STATUS_SYMBOLS,
  NEED_STATUS_TONES,
  NEED_URGENCY_LABEL_KEYS,
  NEED_URGENCY_SYMBOLS,
  NEED_URGENCY_TONES,
} from "../../../../../constants/project";
import type { NeedStatus, NeedUrgency } from "../../../../../types/project";
import { cn } from "../../../../../utils/cn";

const PILL =
  "inline-flex items-center gap-1.5 rounded-pill px-2.5 py-1 text-tag font-bold tracking-button uppercase";

export function UrgencyBadge({ urgency }: { urgency: NeedUrgency }) {
  const { t } = useTranslation();
  return (
    <span className={cn(PILL, NEED_URGENCY_TONES[urgency])}>
      <span aria-hidden className="font-black">
        {NEED_URGENCY_SYMBOLS[urgency]}
      </span>
      {t(NEED_URGENCY_LABEL_KEYS[urgency])}
    </span>
  );
}

export function StatusBadge({ status }: { status: NeedStatus }) {
  const { t } = useTranslation();
  return (
    <span className={cn(PILL, NEED_STATUS_TONES[status])}>
      <span aria-hidden>{NEED_STATUS_SYMBOLS[status]}</span>
      {t(NEED_STATUS_LABEL_KEYS[status])}
    </span>
  );
}
