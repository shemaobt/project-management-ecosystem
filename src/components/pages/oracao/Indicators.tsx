import { useTranslation } from "react-i18next";
import { cn } from "../../../utils/cn";
import { formatNumber } from "../../../utils/format";
import type { PrayerIndicators } from "../../../utils/prayer";

export interface IndicatorsProps {
  indicators: PrayerIndicators | null;
}

interface StatSpec {
  key: keyof PrayerIndicators;
  labelKey: string;
  hero: boolean;
}

const STATS: readonly StatSpec[] = [
  { key: "gathered", labelKey: "oracao_total", hero: true },
  { key: "regions", labelKey: "oracao_regions", hero: false },
  { key: "answered", labelKey: "oracao_answered", hero: false },
];

export function Indicators({ indicators }: IndicatorsProps) {
  const { t } = useTranslation();
  const locale = t("locale");

  return (
    <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-[1.4fr_1fr_1fr]">
      {STATS.map((stat) => (
        <div
          key={stat.key}
          className={cn(
            "rounded-[16px] border border-line px-5.5 py-4.5",
            stat.hero ? "bg-inverse" : "bg-elevated",
          )}
        >
          <div
            className={cn(
              "text-[38px] leading-none font-extrabold tracking-[-0.01em] tabular-nums",
              stat.hero ? "text-on-dark" : "text-telha",
            )}
          >
            {indicators === null ? (
              <>
                <span aria-hidden>—</span>
                <span className="sr-only">{t("loading")}</span>
              </>
            ) : (
              formatNumber(indicators[stat.key], locale)
            )}
          </div>
          <div
            className={cn(
              "mt-2 text-[11px] leading-[1.2] font-bold tracking-[0.08em] uppercase",
              stat.hero ? "text-on-dark" : "text-fg-strong",
            )}
          >
            {t(stat.labelKey)}
          </div>
        </div>
      ))}
    </div>
  );
}
