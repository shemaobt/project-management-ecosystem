import { useTranslation } from "react-i18next";
import { surfaceOutlined } from "../../../styles";
import type { FormReadiness } from "../../../types/forms";
import { cn } from "../../../utils/cn";
import { formatDate } from "../../../utils/format";

export interface PendingProjectsProps {
  readiness: FormReadiness;
}

export function PendingProjects({ readiness }: PendingProjectsProps) {
  const { t } = useTranslation();

  return (
    <section className={cn("rounded-lg p-6 shadow-card", surfaceOutlined)}>
      <h2 className="text-h4 leading-tight font-black tracking-tight text-fg-strong">
        {t("forms_pending_title")}
      </h2>
      <p className="mt-1.5 text-small leading-normal text-fg-muted">
        {t("forms_readiness", {
          reported: readiness.reported,
          total: readiness.total,
        })}
      </p>

      {readiness.pending.length === 0 ? (
        <p className="mt-4 text-small leading-normal text-verde-claro-ink">
          {t("forms_pending_none")}
        </p>
      ) : (
        <ul className="mt-4 max-h-96 overflow-y-auto">
          {readiness.pending.map((project) => (
            <li
              key={project.id}
              className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 border-b border-line py-2 last:border-b-0"
            >
              <span className="min-w-0 text-small font-semibold wrap-anywhere text-fg-strong">
                {project.languageName}
                <span className="ml-2 text-tag font-normal text-fg-subtle">
                  {t(project.regionLabelKey)}
                </span>
              </span>
              <span className="shrink-0 text-tag tabular-nums text-fg-muted">
                {project.lastDate
                  ? t("forms_last_report", {
                      date: formatDate(project.lastDate),
                    })
                  : t("forms_never_reported")}
              </span>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-4 text-micro leading-normal text-fg-subtle">
        {t("forms_reporting_note")}
      </p>
    </section>
  );
}
