import { useTranslation } from "react-i18next";
import { surfaceOutlined } from "../../../styles";
import type { EtenYearReport } from "../../../types/eten";
import { cn } from "../../../utils/cn";
import { creditReason, locationLabel } from "./evidence";

export interface CreditBreakdownProps {
  report: EtenYearReport;
}

export function CreditBreakdown({ report }: CreditBreakdownProps) {
  const { t } = useTranslation();
  const contributing = report.snapshots.filter(
    (snapshot) => (snapshot.credits ?? 0) > 0,
  );

  return (
    <section
      aria-labelledby="eten-breakdown-title"
      className={cn("mt-5.5 rounded-lg p-5 shadow-card", surfaceOutlined)}
    >
      <h2
        id="eten-breakdown-title"
        className="text-eyebrow font-bold tracking-eyebrow uppercase text-fg-muted"
      >
        {t("eten_breakdown_title")}
      </h2>
      <p className="mt-1 text-small leading-normal text-fg-muted">
        {t("eten_breakdown_lead")}
      </p>

      {contributing.length === 0 ? (
        <p className="mt-3 text-small text-fg-subtle">
          {t("eten_breakdown_empty")}
        </p>
      ) : (
        <ol className="mt-3 flex flex-col gap-2.5">
          {contributing.map((snapshot) => (
            <li
              key={snapshot.projectId}
              className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5 border-b border-line pb-2.5"
            >
              <span className="min-w-0 flex-1">
                <span className="font-semibold wrap-anywhere text-fg-strong">
                  {snapshot.languageName}
                </span>{" "}
                <span className="text-tag text-fg-subtle">
                  {locationLabel(snapshot.country, t)}
                </span>
                <span className="mt-0.5 block text-micro leading-normal text-fg-muted">
                  {creditReason(snapshot, t)}
                </span>
              </span>
              <span className="font-black tabular-nums text-fg-strong">
                {t("eten_breakdown_credits", { count: snapshot.credits ?? 0 })}
              </span>
            </li>
          ))}
        </ol>
      )}

      <p className="mt-3 flex justify-between gap-4 text-small font-bold text-fg-strong">
        <span>{t("eten_total")}</span>
        <span className="tabular-nums">{report.totalCredits}</span>
      </p>
    </section>
  );
}
