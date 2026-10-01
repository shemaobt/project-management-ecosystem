import { useEffect, useId, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { useProjectsStore } from "../../../../stores/projectsStore";
import { surfaceOutlined } from "../../../../styles";
import type { Project } from "../../../../types/project";
import type { ApiFailure } from "../../../../types/session";
import {
  annualReportYears,
  buildAnnualReport,
  defaultAnnualYear,
  offeredYear,
  type AnnualRegion,
  type ReportedProject,
} from "../../../../utils/annualReport";
import { cn } from "../../../../utils/cn";
import { getRegionLabelKey } from "../../../../utils/region";
import { LoadingSpinner } from "../../../common/LoadingSpinner";
import { ProjectsUnread } from "../../../common/ProjectsUnread";
import {
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../ui";

function ProjectLine({ project }: { project: ReportedProject }) {
  const { t } = useTranslation();

  return (
    <li className="text-small leading-snug text-fg">
      <span className="font-semibold text-fg-strong">{project.languageName}</span>
      <span className="text-fg-subtle">
        {" · "}
        {project.location.withheld
          ? t(project.location.regionLabelKey)
          : project.location.location}
      </span>
    </li>
  );
}

function RegionBlock({ entry }: { entry: AnnualRegion }) {
  const { t } = useTranslation();

  return (
    <section className={cn("rounded-lg p-5 shadow-card", surfaceOutlined)}>
      <h2 className="mb-3 text-[13px] leading-tight font-bold tracking-[0.03em] uppercase text-fg-strong">
        {t(getRegionLabelKey(entry.region))}
      </h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {(["started", "finished"] as const).map((kind) => (
          <div key={kind}>
            <p className="mb-1.5 text-micro font-bold tracking-button uppercase text-fg-muted">
              {t(`relatorio_${kind}`)} · {entry[kind].length}
            </p>
            {entry[kind].length === 0 ? (
              <p className="text-micro text-fg-subtle">—</p>
            ) : (
              <ul className="flex list-none flex-col gap-1">
                {entry[kind].map((project) => (
                  <ProjectLine key={project.id} project={project} />
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

export interface RelatorioViewProps {
  projects: readonly Project[] | null;
  year: number;
  onYearChange: (year: number) => void;
  now?: Date;
  /** Why the project list could not be read — said, with a retry, instead of a spinner. */
  loadFailure?: ApiFailure | null;
  onRetry?: () => void;
}

/**
 * The annual report GATE-02 made of the Celebration (FE-50, OBT-533). Composed from the
 * surfaces the Ritmo and ETEN already draw — header, outlined cards and a year selector like
 * ETEN's — and nothing new. **No goals section**: there is no model of a goal yet, and the
 * question is on the issue.
 */
export function RelatorioView({
  projects,
  year,
  onYearChange,
  now = new Date(),
  loadFailure = null,
  onRetry,
}: RelatorioViewProps) {
  const { t } = useTranslation();
  const fieldId = useId();
  const years = useMemo(() => annualReportYears(now), [now]);
  const report = useMemo(
    () => buildAnnualReport(projects ?? [], year),
    [projects, year],
  );

  return (
    <section className="mx-auto w-full max-w-(--container-reading) px-(--container-pad) pt-8 pb-20">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-5">
        <div className="min-w-0 flex-1">
          <p className="mb-2.5 text-eyebrow font-bold tracking-eyebrow uppercase text-telha">
            {t("relatorio_eyebrow")}
          </p>
          <h1 className="mb-3 text-h2 leading-tight font-black tracking-tight text-balance text-fg-strong">
            {t("relatorio_title", { year })}
          </h1>
          <p className="max-w-[72ch] font-serif text-lead leading-normal text-pretty italic text-fg-muted">
            {t("relatorio_lead")}
          </p>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={fieldId}>{t("relatorio_year")}</Label>
          <Select
            value={String(year)}
            onValueChange={(next) => onYearChange(Number(next))}
          >
            <SelectTrigger id={fieldId} className="min-w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {years.map((option) => (
                <SelectItem key={option} value={String(option)}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </header>

      {projects === null && loadFailure && onRetry ? (
        <ProjectsUnread failure={loadFailure} onRetry={onRetry} />
      ) : projects === null ? (
        <div className="flex justify-center py-16">
          <LoadingSpinner size="lg" label={t("loading")} />
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
            {(["started", "finished"] as const).map((kind) => (
              <section
                key={kind}
                className={cn("rounded-lg p-5 shadow-card", surfaceOutlined)}
              >
                <p className="text-h2 leading-none font-black text-fg-strong">
                  {report.hasData ? report[kind] : "—"}
                </p>
                <p className="mt-1.5 text-micro font-bold tracking-button uppercase text-fg-muted">
                  {t(`relatorio_${kind}`)}
                </p>
              </section>
            ))}
          </div>

          {report.hasData ? null : (
            <p className="rounded-md border border-line bg-muted px-4 py-3 text-small leading-normal text-fg-muted">
              {t("relatorio_no_data", { year })}
            </p>
          )}

          {report.finishedUndated > 0 ? (
            <p className="text-small leading-normal text-fg-muted">
              {t("relatorio_undated", { count: report.finishedUndated })}
            </p>
          ) : null}

          {report.regions.map((entry) => (
            <RegionBlock key={entry.region} entry={entry} />
          ))}

          <p className="max-w-[80ch] text-micro leading-normal text-fg-subtle">
            {t("relatorio_calendar_note")}
          </p>
        </div>
      )}
    </section>
  );
}

export function RelatorioPage() {
  const { year: param } = useParams();
  const navigate = useNavigate();
  const projects = useProjectsStore((state) => state.projects);
  const hydrated = useProjectsStore((state) => state.hydrated);
  const hydrate = useProjectsStore((state) => state.hydrate);
  const loadFailure = useProjectsStore((state) => state.error);
  const reload = useProjectsStore((state) => state.reload);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  const year = offeredYear(param);
  if (year === null) {
    return <Navigate to={`/ritmo/relatorio/${defaultAnnualYear()}`} replace />;
  }

  return (
    <RelatorioView
      projects={hydrated ? projects : null}
      year={year}
      onYearChange={(next) => void navigate(`/ritmo/relatorio/${next}`)}
      loadFailure={loadFailure}
      onRetry={() => void reload()}
    />
  );
}
