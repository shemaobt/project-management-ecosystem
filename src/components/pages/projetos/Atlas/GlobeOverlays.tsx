import { EyeOff } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  GLOBE_FOCUS_POINTS,
  type GlobeFocusPoint,
} from "../../../../constants/geo";
import { cn } from "../../../../utils/cn";
import type { NightStats } from "./markers";

const overlayPill =
  "absolute z-3 rounded-pill border border-[rgba(246,245,235,0.14)] bg-[rgba(20,14,32,0.6)] backdrop-blur-[8px]";

const controlButton =
  "inline-flex size-7 items-center justify-center rounded-pill text-tag font-extrabold tracking-button text-areia transition-all duration-fast ease-out hover:bg-[rgba(190,74,1,0.32)] hover:text-branco";

export interface GlobeControlsProps {
  autoRotate: boolean;
  onToggleRotate: () => void;
  onFocus: (point: GlobeFocusPoint) => void;
}

export function GlobeControls({
  autoRotate,
  onToggleRotate,
  onFocus,
}: GlobeControlsProps) {
  const { t } = useTranslation();
  return (
    <div
      className={cn(
        overlayPill,
        "top-5 left-5 flex gap-[3px] border-[rgba(246,245,235,0.18)] bg-[rgba(20,14,32,0.78)] p-1 backdrop-blur-[10px] max-sm:top-3 max-sm:left-3",
      )}
    >
      <button
        type="button"
        className={controlButton}
        onClick={onToggleRotate}
        title={t("atlas_autorotate")}
      >
        {autoRotate ? "❚❚" : "▶"}
      </button>
      <div className="my-1 w-px bg-[rgba(246,245,235,0.20)]" />
      {GLOBE_FOCUS_POINTS.map((point) => (
        <button
          key={point.key}
          type="button"
          className={cn(controlButton, "text-[10px]")}
          onClick={() => onFocus(point)}
        >
          {point.label}
        </button>
      ))}
    </div>
  );
}

export function NightStatsOverlay({ stats }: { stats: NightStats }) {
  const { t } = useTranslation();
  const items = [
    { value: stats.total, label: t("atlas_stat_languages") },
    { value: stats.regions, label: t("atlas_stat_regions") },
    { value: stats.inProgress, label: t("atlas_stat_active") },
  ];
  return (
    <div
      className={cn(
        overlayPill,
        "top-5 right-5 flex gap-4 px-4.5 py-2 max-sm:top-3 max-sm:right-3 max-sm:gap-2.5 max-sm:px-3 max-sm:py-1.5",
      )}
    >
      {items.map((item) => (
        <div
          key={item.label}
          className="flex flex-col items-center leading-[1.1]"
        >
          <span className="font-sans text-lead font-black tracking-[-0.02em] text-branco tabular-nums max-sm:text-body">
            {item.value}
          </span>
          <span className="mt-[3px] text-[9px] font-semibold tracking-[0.12em] uppercase text-areia">
            {item.label}
          </span>
        </div>
      ))}
    </div>
  );
}

export function SensitiveNotice({ count }: { count: number }) {
  const { t } = useTranslation();
  if (count === 0) return null;
  return (
    <div
      className={cn(
        overlayPill,
        "bottom-5 left-5 flex items-center gap-2 px-3.5 py-2 text-[10px] font-semibold tracking-[0.04em] text-areia max-sm:bottom-3 max-sm:left-3",
      )}
    >
      <EyeOff size={12} strokeWidth={1.75} aria-hidden />
      <span>{t("atlas_sensitive_notice", { count })}</span>
    </div>
  );
}

export function GlobeHint() {
  const { t } = useTranslation();
  return (
    <div className="pointer-events-none absolute bottom-[18px] left-1/2 -translate-x-1/2 font-serif text-tag italic tracking-[0.04em] text-[rgba(246,245,235,0.55)]">
      <span>↔ {t("atlas_hint")}</span>
    </div>
  );
}
