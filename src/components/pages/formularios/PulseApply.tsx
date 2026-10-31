import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { failureMessage, toApiFailure } from "../../../services/api";
import type { ReceivedSubmission, SubmissionApplyResult } from "../../../types/forms";
import { formatDate } from "../../../utils/format";
import { OutcomePanel } from "../../common/OutcomePanel";
import { Button } from "../../ui";
import { conflictSentence } from "../ficha/saveReport";
import { afterAttempt, buttonFor, type ApplyAction, type ApplyStep } from "./pulseApply";

export interface PulseApplyAccess {
  allows: (submission: ReceivedSubmission) => boolean;
  /** The record's version now — its `ETag` — read when the Pulse is opened. */
  readVersion: (projectId: string) => Promise<string>;
  submit: (submissionId: string, version: string) => Promise<SubmissionApplyResult>;
  applying: readonly string[];
}

export interface PulseApplyViewProps {
  step: ApplyStep;
  inFlight: boolean;
  onAction: (action: ApplyAction) => void;
}

/**
 * One button for every step, always the second child: the notice comes and goes above it, so the
 * element a keyboard user pressed is the element still focused when a 409 answers. While nothing
 * may be pressed it is `aria-disabled`, never `disabled`, which would drop the focus to `<body>`.
 */
export function PulseApplyView({ step, inFlight, onAction }: PulseApplyViewProps) {
  const { t } = useTranslation();
  const button = buttonFor(step, inFlight);

  return (
    <div className="mt-3 flex flex-col items-start gap-2.5">
      <ApplyNotice step={step} />
      <Button
        type="button"
        size="sm"
        aria-disabled={button.action === null || undefined}
        onClick={() => {
          if (button.action) onAction(button.action);
        }}
      >
        {t(button.labelKey)}
      </Button>
    </div>
  );
}

function ApplyNotice({ step }: { step: ApplyStep }) {
  const { t } = useTranslation();
  switch (step.kind) {
    case "reading":
      return <p className="text-tag text-fg-subtle">{t("forms_apply_reading")}</p>;
    case "unread":
      return (
        <OutcomePanel tone="quiet" title={failureMessage(step.failure, t)}>
          <p>{t("forms_apply_unread")}</p>
        </OutcomePanel>
      );
    case "conflict":
      return (
        <OutcomePanel tone="attention" title={t("forms_apply_conflict_title")}>
          <p>{conflictSentence(step.conflict, t)}</p>
          <p className="font-semibold">{t("forms_apply_conflict_kept")}</p>
        </OutcomePanel>
      );
    case "failed":
      return (
        <OutcomePanel tone="quiet" title={failureMessage(step.failure, t)}>
          <p>{t("forms_apply_failed")}</p>
        </OutcomePanel>
      );
    case "ready":
      return null;
  }
}

export interface PulseApplyProps {
  submission: ReceivedSubmission;
  access: PulseApplyAccess;
}

/**
 * The apply of one opened Pulse: the record's version is read on mount — when the coordinator
 * opened the Pulse — and quoted on the click. A second click while one is on its way does nothing,
 * here and in the store; a 409 answered after the Pulse was closed is lost with it, and opening it
 * again reads the version afresh.
 */
export function PulseApply({ submission, access }: PulseApplyProps) {
  const { t } = useTranslation();
  const [step, setStep] = useState<ApplyStep>({ kind: "reading" });
  const busy = useRef(false);
  const { projectId, id } = submission;
  const { readVersion, submit } = access;

  useEffect(() => {
    let alive = true;
    readVersion(projectId).then(
      (version) => alive && setStep({ kind: "ready", version }),
      (raw: unknown) => alive && setStep({ kind: "unread", failure: toApiFailure(raw) }),
    );
    return () => {
      alive = false;
    };
  }, [projectId, readVersion]);

  const onAction = (action: ApplyAction) => {
    if (busy.current) return;
    busy.current = true;
    if (action.kind === "read") {
      setStep({ kind: "reading" });
      readVersion(projectId)
        .then(
          (version) => setStep({ kind: "ready", version }),
          (raw: unknown) => setStep({ kind: "unread", failure: toApiFailure(raw) }),
        )
        .finally(() => {
          busy.current = false;
        });
      return;
    }
    submit(id, action.version)
      .then((result) => {
        if (result.ok) toast.success(t("toast_field_received"));
        setStep(afterAttempt(result, action.version));
      })
      .finally(() => {
        busy.current = false;
      });
  };

  return (
    <PulseApplyView
      step={step}
      inFlight={access.applying.includes(id)}
      onAction={onAction}
    />
  );
}

export interface AppliedNoteProps {
  submission: ReceivedSubmission & { appliedAt: string };
}

/**
 * An applied Pulse, opened: the server no longer answers the answers it wrote to the record, so
 * the note says where they are read now, and leads to the progress — the link is named for what it
 * opens, and promises no change the Pulse may not have carried.
 */
export function AppliedNote({ submission }: AppliedNoteProps) {
  const { t } = useTranslation();
  return (
    <div className="mt-3 flex flex-col items-start gap-2.5">
      <p className="text-small leading-normal text-fg">
        {t("forms_applied_note", { date: formatDate(submission.appliedAt) })}
      </p>
      <Button asChild size="sm" variant="ghost">
        <Link
          to={`/ficha/${encodeURIComponent(submission.projectId)}/progresso`}
          data-applied-link={submission.id}
        >
          {t("forms_apply_open_record")}
        </Link>
      </Button>
    </div>
  );
}
