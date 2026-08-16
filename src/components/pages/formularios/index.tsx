import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { FIELD_FORMS } from "../../../constants/forms";
import { useFormsStore } from "../../../stores/formsStore";
import { useProjectsStore } from "../../../stores/projectsStore";
import type { ReceivedSubmission } from "../../../types/forms";
import type { Project } from "../../../types/project";
import { formOf, formReadiness, reportingFor, selectableProjects } from "../../../utils/forms";
import { toLocalIsoDate } from "../../../utils/format";
import { EmptyState } from "../../common/EmptyState";
import { LoadingSpinner } from "../../common/LoadingSpinner";
import { Button } from "../../ui";
import { FormCard } from "./FormCard";
import { PendingProjects } from "./PendingProjects";
import { ProjectSelector } from "./ProjectSelector";
import { ReceivedArchive } from "./ReceivedArchive";
import { StepByStep } from "./StepByStep";

export interface FormulariosViewProps {
  projects: readonly Project[] | null;
  submissions?: readonly ReceivedSubmission[];
  now?: Date;
}

export function FormulariosView({
  projects,
  submissions = [],
  now,
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

  const readiness = useMemo(
    () => formReadiness(pulse, sorted, new Date(`${todayIso}T00:00:00`)),
    [pulse, sorted, todayIso],
  );

  const reporting = useMemo(() => {
    if (!project) return null;
    const at = new Date(`${todayIso}T00:00:00`);
    return FIELD_FORMS.map((form) => ({
      form,
      state: reportingFor(form, project, at),
    }));
  }, [project, todayIso]);

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

      {projects === null ? (
        <div className="flex justify-center py-16">
          <LoadingSpinner size="lg" label={t("loading")} />
        </div>
      ) : !project || !reporting || !pulseState ? (
        <EmptyState message={t("forms_no_projects")} />
      ) : (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {reporting.map(({ form, state }) => (
              <FormCard
                key={form.kind}
                form={form}
                reporting={state}
                action={
                  form.mechanism === "inApp" ? (
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

          <StepByStep
            projectName={project.languageName}
            reporting={pulseState}
          />

          <PendingProjects form={pulse} readiness={readiness} />

          <ReceivedArchive submissions={submissions} />

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
  const submissions = useFormsStore((state) => state.submissions);
  const hydrateForms = useFormsStore((state) => state.hydrate);

  useEffect(() => {
    void hydrateProjects();
    void hydrateForms();
  }, [hydrateProjects, hydrateForms]);

  return (
    <FormulariosView
      projects={hydrated ? projects : null}
      submissions={submissions}
    />
  );
}
