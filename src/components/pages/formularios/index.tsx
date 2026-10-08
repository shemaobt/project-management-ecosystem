import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { FIELD_FORMS } from "../../../constants/forms";
import { useAuth } from "../../../contexts/AuthContext";
import { useFormsStore } from "../../../stores/formsStore";
import { useProjectsStore } from "../../../stores/projectsStore";
import type { ReceivedSubmission } from "../../../types/forms";
import type { ApiFailure } from "../../../types/session";
import type { Project } from "../../../types/project";
import { canWriteHealth } from "../../../utils/access";
import { formOf, formReadiness, reportingFor, selectableProjects } from "../../../utils/forms";
import { toLocalIsoDate } from "../../../utils/format";
import { EmptyState } from "../../common/EmptyState";
import { LoadingSpinner } from "../../common/LoadingSpinner";
import { ProjectsUnread } from "../../common/ProjectsUnread";
import { Button } from "../../ui";
import { FormCard } from "./FormCard";
import { PendingProjects } from "./PendingProjects";
import { ProjectSelector } from "./ProjectSelector";
import { ReceivedArchive } from "./ReceivedArchive";
import { StepByStep } from "./StepByStep";

export interface FormulariosViewProps {
  projects: readonly Project[] | null;
  /**
   * `null` is *not read* — still loading, or the read failed. Since FE-49 the Pulse counts as
   * returned only when a submission arrived, so an unread archive would render every team as
   * *not reported*; the Pulse-dependent blocks give way to a sentence instead (PR #62 review).
   */
  submissions?: readonly ReceivedSubmission[] | null;
  now?: Date;
  /** Why the project list could not be read — said, with a retry, instead of a spinner. */
  loadFailure?: ApiFailure | null;
  onRetry?: () => void;
  /**
   * Whether this reader files a health assessment (`canWriteHealth`, OBT-579). Without it the
   * card draws no button: the server refuses the filing at the end of the four dimensions, and
   * a form walked through to a refusal is the dead control the console does not draw.
   */
  writesHealth?: boolean;
}

export function FormulariosView({
  projects,
  submissions = [],
  now,
  loadFailure = null,
  onRetry,
  writesHealth = true,
}: FormulariosViewProps) {
  const { t } = useTranslation();
  const [picked, setPicked] = useState("");
  const todayIso = toLocalIsoDate(now);

  const sorted = useMemo(
    () => selectableProjects(projects ?? []),
    [projects],
  );
  const project = sorted.find((entry) => entry.id === picked) ?? sorted[0];

  const pulse = formOf("pulso");
  const pulsesKnown = submissions !== null;
  const archive = useMemo(() => submissions ?? [], [submissions]);

  const readiness = useMemo(
    () =>
      formReadiness(
        pulse,
        sorted,
        archive,
        new Date(`${todayIso}T00:00:00`),
      ),
    [pulse, sorted, archive, todayIso],
  );

  const reporting = useMemo(() => {
    if (!project) return null;
    const at = new Date(`${todayIso}T00:00:00`);
    return FIELD_FORMS.map((form) => ({
      form,
      state: reportingFor(form, project, archive, at),
    }));
  }, [project, archive, todayIso]);

  const pulseState =
    reporting?.find(({ form }) => form.kind === pulse.kind)?.state ?? null;

  return (
    <section className="mx-auto w-full max-w-(--container-reading) px-(--container-pad) pt-8 pb-20">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-5">
        <div className="min-w-0 flex-1">
          <p className="mb-2.5 text-eyebrow font-bold tracking-eyebrow uppercase text-telha">
            {t("forms_eyebrow")}
          </p>
          <h1 className="mb-3 text-h2 leading-tight font-black tracking-tight text-balance text-fg-strong">
            {t("forms_title")}
          </h1>
          <p className="max-w-[72ch] font-serif text-lead leading-normal text-pretty italic text-fg-muted">
            {t("forms_lead")}
          </p>
        </div>
        {project ? (
          <ProjectSelector
            projects={sorted}
            value={project.id}
            onChange={setPicked}
          />
        ) : null}
      </header>

      {projects === null && loadFailure && onRetry ? (
        <ProjectsUnread failure={loadFailure} onRetry={onRetry} />
      ) : projects === null ? (
        <div className="flex justify-center py-16">
          <LoadingSpinner size="lg" label={t("loading")} />
        </div>
      ) : !project || !reporting || !pulseState ? (
        <EmptyState message={t("forms_no_projects")} />
      ) : (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {reporting
              .filter(({ form }) => pulsesKnown || form.kind !== pulse.kind)
              .map(({ form, state }) => (
                <FormCard
                  key={form.kind}
                  form={form}
                  reporting={state}
                  action={
                    form.mechanism === "inApp" && writesHealth ? (
                      <Button asChild>
                        <Link to={`/formularios/avaliacao/${project.id}`}>
                          {t("forms_open_health")}
                        </Link>
                      </Button>
                    ) : null
                  }
                />
              ))}
          </div>

          {/* The Health Assessment is filled in-app and reads nothing from the archive, so an
              unread archive takes only the Pulse's blocks with it (PR #62 review). */}
          {pulsesKnown ? (
            <>
              <StepByStep
                projectName={project.languageName}
                reporting={pulseState}
              />

              <PendingProjects form={pulse} readiness={readiness} />

              <ReceivedArchive submissions={archive} />
            </>
          ) : (
            <p className="rounded-md border border-line bg-muted px-4 py-3 text-small leading-normal text-fg-muted">
              {t("forms_pulses_unread")}
            </p>
          )}

          <div className="flex flex-col gap-1.5 text-micro leading-normal text-fg-subtle">
            <p className="max-w-[80ch]">{t("forms_footnote")}</p>
            <p className="max-w-[80ch]">{t("forms_format_pending")}</p>
            <p className="max-w-[80ch]">{t("forms_actions_pending")}</p>
          </div>
        </div>
      )}
    </section>
  );
}

export function FormulariosPage() {
  const projects = useProjectsStore((state) => state.projects);
  const hydrated = useProjectsStore((state) => state.hydrated);
  const hydrateProjects = useProjectsStore((state) => state.hydrate);
  const loadFailure = useProjectsStore((state) => state.error);
  const reloadProjects = useProjectsStore((state) => state.reload);
  const submissions = useFormsStore((state) => state.submissions);
  const formsRead = useFormsStore((state) => state.hydrated);
  const formsLoading = useFormsStore((state) => state.loading);
  const hydrateForms = useFormsStore((state) => state.hydrate);
  const { user } = useAuth();

  useEffect(() => {
    void hydrateProjects();
    void hydrateForms();
  }, [hydrateProjects, hydrateForms]);

  return (
    <FormulariosView
      projects={hydrated && !formsLoading ? projects : null}
      submissions={formsRead ? submissions : null}
      loadFailure={loadFailure}
      onRetry={() => void reloadProjects()}
      writesHealth={canWriteHealth(user.roles)}
    />
  );
}
