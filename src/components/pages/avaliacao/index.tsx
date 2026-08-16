import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import { HEALTH_DIMENSIONS } from "../../../constants/health";
import { useAssessmentStore } from "../../../stores/assessmentStore";
import { useProjectsStore } from "../../../stores/projectsStore";
import type { AssessmentDraft } from "../../../types/assessment";
import type { Project } from "../../../types/project";
import { toAssessment } from "../../../utils/assessment";
import { formatDate } from "../../../utils/format";
import { EmptyState } from "../../common/EmptyState";
import { LoadingSpinner } from "../../common/LoadingSpinner";
import { Button, toast } from "../../ui";
import { Completion } from "./Completion";
import { DimensionStep } from "./DimensionStep";
import { PrayerRequestStep } from "./PrayerRequestStep";

const LAST_STEP = HEALTH_DIMENSIONS.length;

export interface AvaliacaoViewProps {
  project: Project | null | undefined;
  draft: AssessmentDraft;
  onStep: (draft: AssessmentDraft) => void;
  onFinish: (draft: AssessmentDraft) => void;
}

export function AvaliacaoView({
  project,
  draft,
  onStep,
  onFinish,
}: AvaliacaoViewProps) {
  const { t } = useTranslation();
  const [step, setStep] = useState(0);

  const resumed = useMemo(
    () =>
      HEALTH_DIMENSIONS.some(
        (dimension) =>
          draft.ratings[dimension.key] !== "" ||
          draft.notes[dimension.key] !== "",
      ),
    [draft],
  );

  if (project === undefined) {
    return (
      <div className="flex justify-center py-16">
        <LoadingSpinner size="lg" label={t("loading")} />
      </div>
    );
  }

  if (project === null) {
    return (
      <section className="mx-auto w-full max-w-(--container-reading) px-(--container-pad) py-16">
        <EmptyState message={t("hw_not_found")} />
      </section>
    );
  }

  const patch = (next: Partial<AssessmentDraft>) =>
    onStep({ ...draft, ...next });

  const dimension = HEALTH_DIMENSIONS[step];

  return (
    <section className="mx-auto w-full max-w-(--container-reading) px-(--container-pad) pt-8 pb-20">
      <header className="mb-6">
        <p className="mb-2.5 text-eyebrow font-bold tracking-eyebrow uppercase text-accent-press">
          {t("hw_eyebrow")}
        </p>
        <h1 className="mb-3 text-h2 leading-tight font-black tracking-tight text-balance text-fg-strong">
          {t("hw_title", { language: project.languageName })}
        </h1>
        <p className="max-w-[72ch] text-lead leading-normal text-pretty text-fg-muted">
          {t("hw_howto")}
        </p>
        <p className="mt-2 max-w-[72ch] text-small leading-normal text-fg-subtle">
          {t("hw_no_file")}
        </p>
        {resumed ? (
          <p className="mt-2 text-small font-semibold text-verde-claro-ink">
            {t("hw_resumed", { date: formatDate(draft.savedAt) })}
          </p>
        ) : null}
      </header>

      <div className="flex flex-col gap-4">
        {step < LAST_STEP ? (
          <DimensionStep
            dimension={dimension}
            index={step}
            total={LAST_STEP}
            rating={draft.ratings[dimension.key]}
            note={draft.notes[dimension.key]}
            onRating={(rating) =>
              patch({ ratings: { ...draft.ratings, [dimension.key]: rating } })
            }
            onNote={(note) =>
              patch({ notes: { ...draft.notes, [dimension.key]: note } })
            }
            onSkip={() =>
              patch({ ratings: { ...draft.ratings, [dimension.key]: "" } })
            }
          />
        ) : (
          <>
            <Completion draft={draft} onChange={patch} />
            <PrayerRequestStep
              request={draft.prayerRequest}
              visibility={draft.prayerVisibility}
              onRequest={(prayerRequest) => patch({ prayerRequest })}
              onVisibility={(prayerVisibility) => patch({ prayerVisibility })}
            />
          </>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line bg-muted px-5 py-4">
          <p className="text-small leading-normal text-fg-muted">
            {t("hw_autosaved")}
          </p>
          <div className="flex flex-wrap gap-2.5">
            {step > 0 ? (
              <Button
                variant="secondary"
                onClick={() => setStep((current) => current - 1)}
              >
                {t("hw_back")}
              </Button>
            ) : null}
            {step < LAST_STEP ? (
              <Button onClick={() => setStep((current) => current + 1)}>
                {step === LAST_STEP - 1 ? t("hw_review") : t("hw_next")}
              </Button>
            ) : (
              <Button onClick={() => onFinish(draft)}>{t("hw_save")}</Button>
            )}
          </div>
        </div>

        <p className="text-micro leading-normal text-fg-subtle">
          {t("hw_notify")}
        </p>
      </div>
    </section>
  );
}

export function AvaliacaoPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { projectId = "" } = useParams();

  const projects = useProjectsStore((state) => state.projects);
  const hydrated = useProjectsStore((state) => state.hydrated);
  const hydrate = useProjectsStore((state) => state.hydrate);
  const saveProject = useProjectsStore((state) => state.saveProject);

  const drafts = useAssessmentStore((state) => state.drafts);
  const draftFor = useAssessmentStore((state) => state.draftFor);
  const saveStep = useAssessmentStore((state) => state.saveStep);
  const discardDraft = useAssessmentStore((state) => state.discardDraft);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  const project = hydrated
    ? (projects.find((entry) => entry.id === projectId) ?? null)
    : undefined;

  const draft = useMemo(
    () => drafts[projectId] ?? draftFor(projectId),
    [drafts, projectId, draftFor],
  );

  return (
    <AvaliacaoView
      project={project}
      draft={draft}
      onStep={saveStep}
      onFinish={(finished) => {
        if (!project) return;
        const assessment = toAssessment(finished, t);
        saveProject({
          ...project,
          healthEmotional: assessment.emotional,
          healthRelational: assessment.relational,
          healthSpiritual: assessment.spiritual,
          healthPhysical: assessment.physical,
          healthAssessmentDate: assessment.date,
          healthAssessor: assessment.assessor,
          healthNotes: assessment.notes,
          healthHistory: [...(project.healthHistory ?? []), assessment],
          needsPastoralIntervention: finished.pastoral,
          pastoralInterventionName: finished.pastoralWho,
          pastoralInterventionWhen: finished.pastoralWhen,
          prayerRequests: finished.prayerRequest,
          prayerVisibility: finished.prayerVisibility,
        });
        discardDraft(projectId);
        toast.success(t("hw_saved", { language: project.languageName }));
        void navigate("/formularios");
      }}
    />
  );
}
