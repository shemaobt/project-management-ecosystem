import { Award, BookOpen, TrendingUp } from "lucide-react";
import { useTranslation } from "react-i18next";
import { surfaceOutlined } from "../../../styles";
import type { EtenYearReport } from "../../../types/eten";
import { cn } from "../../../utils/cn";

export interface IndicatorsProps {
  report: EtenYearReport;
}

export function Indicators({ report }: IndicatorsProps) {
  const { t } = useTranslation();

  return (
    <div className="mb-5.5 grid grid-cols-1 gap-3.5 sm:grid-cols-3">
      <section
        className={cn(
          "rounded-lg p-5 shadow-card sm:col-span-1",
          surfaceOutlined,
        )}
      >
        <span className="mb-2.5 flex size-9 items-center justify-center rounded-md bg-accent-soft text-telha">
          <Award size={20} strokeWidth={1.75} aria-hidden />
        </span>
        <p className="text-h2 leading-none font-black text-fg-strong">
          {report.hasData ? report.totalCredits : "—"}
        </p>
        <p className="mt-1.5 text-micro font-bold tracking-button uppercase text-fg-muted">
          {t("eten_total_credits")}
        </p>
        <p className="mt-1 text-tag leading-[1.4] text-fg-subtle">
          {t("eten_credits_note")}
        </p>
      </section>

      <section className={cn("rounded-lg p-5 shadow-card", surfaceOutlined)}>
        <span className="mb-2.5 flex size-9 items-center justify-center rounded-md bg-muted text-fg-muted">
          <BookOpen size={20} strokeWidth={1.75} aria-hidden />
        </span>
        <p className="text-h2 leading-none font-black text-fg-strong">
          {report.listedProjects}
        </p>
        <p className="mt-1.5 text-micro font-bold tracking-button uppercase text-fg-muted">
          {t("eten_listed")}
        </p>
        <p className="mt-1 text-tag leading-[1.4] text-fg-subtle">
          {t("eten_listed_sub")}
        </p>
      </section>

      <section className={cn("rounded-lg p-5 shadow-card", surfaceOutlined)}>
        <span className="mb-2.5 flex size-9 items-center justify-center rounded-md bg-muted text-fg-muted">
          <TrendingUp size={20} strokeWidth={1.75} aria-hidden />
        </span>
        <p className="text-h2 leading-none font-black text-fg-strong">
          {report.hasData ? report.advancingProjects : "—"}
        </p>
        <p className="mt-1.5 text-micro font-bold tracking-button uppercase text-fg-muted">
          {t("eten_advancing")}
        </p>
        <p className="mt-1 text-tag leading-[1.4] text-fg-subtle">
          {t("eten_advancing_sub")} {report.year}
        </p>
      </section>
    </div>
  );
}
