import { useTranslation } from "react-i18next";
import type { EtenYearReport } from "../../../types/eten";
import { formatDate, utcDay } from "../../../utils/format";

export interface ReportProvenanceProps {
  report: EtenYearReport;
}

export function ReportProvenance({ report }: ReportProvenanceProps) {
  const { t } = useTranslation();
  const recordedDay = report.recordedAt ? utcDay(report.recordedAt) : "";

  return (
    <div className="mb-5.5 flex flex-col gap-1 text-micro leading-normal text-fg-muted">
      <p>
        {t("eten_period", {
          start: formatDate(report.periodStart),
          end: formatDate(report.periodEnd),
        })}
      </p>
      <p>{t("eten_computed_for", { date: formatDate(report.asOf) })}</p>
      {report.reportId ? (
        <p>
          {recordedDay
            ? `${t("eten_recorded_on", { date: formatDate(recordedDay) })} `
            : null}
          <span className="text-fg-subtle">
            {t("eten_report_ref")}{" "}
            <code className="wrap-anywhere">{report.reportId}</code>
          </span>
        </p>
      ) : (
        <p className="text-fg-subtle">{t("eten_not_recorded")}</p>
      )}
    </div>
  );
}
