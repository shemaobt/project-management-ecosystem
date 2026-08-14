import { useMemo, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { useFiltersStore } from "../../../stores/filtersStore";
import { usePrefsStore } from "../../../stores/prefsStore";
import type { Project } from "../../../types/project";
import { cn } from "../../../utils/cn";
import { formatNumber } from "../../../utils/format";
import {
  INDICATORS,
  indicatorCount,
  indicatorHref,
  indicatorView,
  type IndicatorSpec,
} from "../../../utils/indicators";

export interface IndicatorBandProps {
  projects: readonly Project[] | null;
}

const CELL = "border-r border-line px-3.5 py-1";

function IndicatorContent({
  spec,
  count,
  locale,
}: {
  spec: IndicatorSpec;
  count: number | null;
  locale: string;
}) {
  const { t } = useTranslation();

  return (
    <>
      <div
        className={cn(
          "text-[34px] leading-none font-black tracking-[-0.02em] tabular-nums",
          spec.accent && count !== null && count > 0
            ? "text-telha"
            : "text-fg",
        )}
      >
        {count === null ? (
          <>
            <span aria-hidden>—</span>
            <span className="sr-only">{t("loading")}</span>
          </>
        ) : (
          formatNumber(count, locale)
        )}
      </div>
      <div className="mt-1.5 text-[10px] leading-[1.3] font-semibold tracking-[0.12em] text-fg-muted uppercase">
        {t(spec.labelKey)}
      </div>
      <div className="mt-0.5 font-serif text-[11px] text-fg-subtle italic">
        {t(spec.tailKey)}
      </div>
    </>
  );
}

export function IndicatorBand({ projects }: IndicatorBandProps) {
  const { t } = useTranslation();
  const applyState = useFiltersStore((state) => state.applyState);
  const sort = usePrefsStore((state) => state.sort);
  const metaphor = usePrefsStore((state) => state.metaphor);
  const locale = t("locale");

  const counts = useMemo(() => {
    if (projects === null) return null;
    const now = new Date();
    return INDICATORS.map((spec) => indicatorCount(spec, projects, now));
  }, [projects]);

  const open = (spec: IndicatorSpec) => {
    const view = indicatorView(spec, { sort, metaphor });
    applyState(view.filters, view.search);
  };

  const cell = (spec: IndicatorSpec, content: ReactNode) => {
    if (spec.filters === null) {
      return (
        <div key={spec.id} className={CELL}>
          {content}
        </div>
      );
    }
    return (
      <Link
        key={spec.id}
        to={indicatorHref(spec, { sort, metaphor })}
        onClick={() => open(spec)}
        className={cn(
          CELL,
          "no-underline transition-colors duration-fast ease-out",
          "hover:bg-muted hover:no-underline",
        )}
      >
        {content}
      </Link>
    );
  };

  return (
    <div className="grid grid-cols-2 border-l border-line sm:grid-cols-3 lg:grid-cols-6">
      {INDICATORS.map((spec, index) =>
        cell(
          spec,
          <IndicatorContent
            spec={spec}
            count={counts === null ? null : counts[index]}
            locale={locale}
          />,
        ),
      )}
    </div>
  );
}
