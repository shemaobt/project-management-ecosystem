import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import { HEALTH_DIMENSIONS } from "../../../constants/health";
import { useAuth } from "../../../contexts/AuthContext";
import { failureMessage } from "../../../services/api";
import { useAssessmentStore } from "../../../stores/assessmentStore";
import { useProjectRecordStore } from "../../../stores/projectRecordStore";
import type { AssessmentDraft } from "../../../types/assessment";
import type { Project } from "../../../types/project";
import type { ApiFailure } from "../../../types/session";
import { formatDate } from "../../../utils/format";
import { EmptyState } from "../../common/EmptyState";
import { LoadingSpinner } from "../../common/LoadingSpinner";
import { Button, toast } from "../../ui";
import { Completion } from "./Completion";
import { DimensionStep } from "./DimensionStep";
import { PrayerRequestStep } from "./PrayerRequestStep";
import { SubmitOutcomeNote, type SubmitOutcome } from "./SubmitOutcomeNote";

const LAST_STEP = HEALTH_DIMENSIONS.length;

export interface AvaliacaoViewProps {
  project: Project | null | undefined;
  loadError?: ApiFailure | null;
  onRetryLoad?: () => void;
  draft: AssessmentDraft;
  submitting?: boolean;
  submitOutcome?: SubmitOutcome | null;
  onStep: (draft: AssessmentDraft) => void;
  onFinish: (draft: AssessmentDraft) => void;
}

export function AvaliacaoView({
  project,
  loadError,
  onRetryLoad,
  draft,
  submitting = false,
  submitOutcome = null,
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
    const isNotFound = !loadError || loadError.kind === "notFound";
    return (
      <section className="mx-auto w-full max-w-(--container-reading) px-(--container-pad) py-16">
        <EmptyState
          message={isNotFound ? t("hw_not_found") : failureMessage(loadError, t)}
          action={
            isNotFound || !onRetryLoad ? undefined : (
              <Button variant="secondary" size="sm" onClick={onRetryLoad}>
                {t("net_retry")}
              </Button>
            )
          }
        />
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

        {submitOutcome ? <SubmitOutcomeNote outcome={submitOutcome} /> : null}

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line bg-muted px-5 py-4">
          <p className="text-small leading-normal text-fg-muted">
            {t("hw_autosaved")}
          </p>
          <div className="flex flex-wrap gap-2.5">
            {step > 0 ? (
              <Button
                variant="secondary"
                onClick={() => setStep((current) => current - 1)}
                disabled={submitting}
              >
                {t("hw_back")}
              </Button>
            ) : null}
            {step < LAST_STEP ? (
              <Button onClick={() => setStep((current) => current + 1)}>
                {step === LAST_STEP - 1 ? t("hw_review") : t("hw_next")}
              </Button>
            ) : (
              <Button onClick={() => onFinish(draft)} disabled={submitting}>
                {submitting ? t("record_saving") : t("hw_save")}
              </Button>
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
  const { user } = useAuth();

  const open = useProjectRecordStore((state) => state.open);
  const reload = useProjectRecordStore((state) => state.reload);
  const record = useProjectRecordStore((state) => state.record);
  const recordId = useProjectRecordStore((state) => state.id);
  const loading = useProjectRecordStore((state) => state.loading);
  const loadError = useProjectRecordStore((state) => state.loadError);
  const submitAssessment = useProjectRecordStore(
    (state) => state.submitAssessment,
  );

  const drafts = useAssessmentStore((state) => state.drafts);
  const draftFor = useAssessmentStore((state) => state.draftFor);
  const saveStep = useAssessmentStore((state) => state.saveStep);
  const discardDraft = useAssessmentStore((state) => state.discardDraft);

  const [submitting, setSubmitting] = useState(false);
  const [submitOutcome, setSubmitOutcome] = useState<SubmitOutcome | null>(
    null,
  );

  useEffect(() => {
    void open(projectId);
  }, [projectId, open]);

  const project =
    loading || recordId !== projectId
      ? undefined
      : (record?.project ?? null);

  const draft = useMemo(
    () => drafts[projectId] ?? draftFor(projectId),
    [drafts, projectId, draftFor],
  );

  return (
    <AvaliacaoView
      project={project}
      loadError={loadError}
      onRetryLoad={() => void reload()}
      draft={draft}
      submitting={submitting}
      submitOutcome={submitOutcome}
      onStep={saveStep}
      onFinish={async (finished) => {
        setSubmitting(true);
        setSubmitOutcome(null);
        const outcome = await submitAssessment(finished, user.name ?? "");
        setSubmitting(false);

        if (outcome.kind === "saved") {
          discardDraft(projectId);
          toast.success(
            t("hw_saved", { language: outcome.project.languageName }),
          );
          void navigate("/formularios");
          return;
        }
        setSubmitOutcome(outcome);
      }}
    />
  );
}
