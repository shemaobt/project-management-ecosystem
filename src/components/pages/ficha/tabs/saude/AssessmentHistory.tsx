import { useTranslation } from "react-i18next";
import { CURRENT_QUESTION_SET_VERSION, HEALTH_DIMENSIONS } from "../../../../../constants/health";
import { HEALTH_LABEL_KEYS } from "../../../../../constants/status";
import type { HealthAssessment } from "../../../../../types/project";
import { formatDate } from "../../../../../utils/format";
import { overallOfEntry } from "../../../../../utils/health";
import { StatusBadge, StatusDot } from "../../../../common/StatusBadge";

export interface AssessmentHistoryProps {
  entries: readonly HealthAssessment[];
}

/**
 * Which set of guiding questions an entry answered — never assumed to be today's.
 *
 * `null`/`undefined` is a row carried out of the record's flat fields before BE-07
 * existed: it answered no questionnaire at all (`app/db/models/shema_health.py`), so it
 * says so rather than implying a version. A number that is not today's still renders —
 * this console has no older wording to show, but naming the version is what keeps a
 * reader from assuming today's four questions were asked.
 */
function versionLabel(
  version: number | null | undefined,
  t: (key: string, params?: Record<string, unknown>) => string,
): string {
  if (version === null || version === undefined) {
    return t("d_health_version_none");
  }
  return version === CURRENT_QUESTION_SET_VERSION
    ? t("d_health_version_current")
    : t("d_health_version", { version });
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
          {[...entries].reverse().map((entry, index) => {
            const overall = entry.overall ?? overallOfEntry(entry);
            return (
              <li
                key={`${entry.date}-${index}`}
                className="flex flex-col gap-1.5 rounded-[10px] border border-line bg-elevated px-3.5 py-2.5"
              >
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                  <span className="text-[13px] font-semibold text-fg">
                    {formatDate(entry.date, locale)}
                  </span>
                  {entry.assessor && (
                    <span className="text-micro text-fg-muted">
                      {t("d_assessor")}: {entry.assessor}
                    </span>
                  )}
                  {entry.author && entry.author !== entry.assessor && (
                    <span className="text-micro text-fg-muted">
                      {t("d_health_author")}: {entry.author}
                    </span>
                  )}
                  <span className="ml-auto flex items-center gap-2">
                    <StatusBadge
                      kind="health"
                      state={overall}
                      label={t(HEALTH_LABEL_KEYS[overall])}
                    />
                    {HEALTH_DIMENSIONS.map((dimension) => (
                      <StatusDot
                        key={dimension.key}
                        state={entry[dimension.key] || "na"}
                        label={t(dimension.labelKey)}
                      />
                    ))}
                  </span>
                </div>
                <p className="text-micro text-fg-subtle">
                  {versionLabel(entry.questionSetVersion, t)}
                </p>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
