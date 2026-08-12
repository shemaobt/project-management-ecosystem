import { useTranslation } from "react-i18next";
import { HEALTH_DIMENSIONS } from "../../../../../constants/health";
import type { HealthAssessment } from "../../../../../types/project";
import { formatDate } from "../../../../../utils/format";
import { StatusDot } from "../../../../common/StatusBadge";

export interface AssessmentHistoryProps {
  entries: readonly HealthAssessment[];
}

export function AssessmentHistory({ entries }: AssessmentHistoryProps) {
  const { t } = useTranslation();
  const locale = t("locale");

  return (
    <section>
      <h3 className="text-[10px] font-bold tracking-[0.14em] uppercase text-fg-muted">
        {t("d_health_history")}
      </h3>

      {entries.length === 0 ? (
        <p className="mt-2 text-micro text-fg-subtle">
          {t("d_health_history_empty")}
        </p>
      ) : (
        <ol className="mt-2.5 flex flex-col gap-2">
          {[...entries].reverse().map((entry, index) => (
            <li
              key={`${entry.date}-${index}`}
              className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-[10px] border border-line bg-elevated px-3.5 py-2.5"
            >
              <span className="text-[13px] font-semibold text-fg">
                {formatDate(entry.date, locale)}
              </span>
              {entry.assessor && (
                <span className="text-micro text-fg-muted">
                  {entry.assessor}
                </span>
              )}
              <span className="ml-auto flex items-center gap-2">
                {HEALTH_DIMENSIONS.map((dimension) => (
                  <StatusDot
                    key={dimension.key}
                    state={entry[dimension.key] || "na"}
                    label={t(dimension.labelKey)}
                  />
                ))}
              </span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
