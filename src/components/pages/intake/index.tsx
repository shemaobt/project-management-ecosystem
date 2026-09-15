import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";
import { formsAPI, toApiFailure, failureMessage } from "../../../services/api";
import type { IntakeAnswers, IntakeForm } from "../../../types/forms";
import {
  classifyIntakeLinkProblem,
  clearIntakeDraft,
  loadIntakeDraft,
  parseSubmitFaults,
  saveIntakeDraft,
  validateIntakeAnswers,
  type IntakeLinkProblem,
} from "../../../utils/intake";
import { LoadingSpinner } from "../../common/LoadingSpinner";
import { IntakeFormView } from "./IntakeFormView";
import {
  IntakeLinkProblemView,
  IntakeNetworkProblemView,
} from "./IntakeLinkProblem";
import { IntakeShell } from "./IntakeShell";
import { IntakeSuccessView } from "./IntakeSuccess";

type Status =
  | { kind: "loading" }
  | { kind: "linkProblem"; problem: IntakeLinkProblem }
  | { kind: "networkProblem"; message: string }
  | { kind: "form" }
  | { kind: "success" };

export function IntakePage() {
  const { token = "" } = useParams<{ token: string }>();
  const { t } = useTranslation();

  const [status, setStatus] = useState<Status>({ kind: "loading" });
  const [form, setForm] = useState<IntakeForm | null>(null);
  const [answers, setAnswers] = useState<IntakeAnswers>({});
  const [draftRestored, setDraftRestored] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [reloadNeeded, setReloadNeeded] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(() => {
    formsAPI
      .intakeForm(token)
      .then((data) => {
        setForm(data);
        const draft = loadIntakeDraft(token);
        if (draft && draft.definitionVersion === data.definitionVersion) {
          setAnswers(draft.answers);
          setDraftRestored(true);
        } else {
          setAnswers({});
          setDraftRestored(false);
        }
        setStatus({ kind: "form" });
      })
      .catch((raw) => {
        const apiFailure = toApiFailure(raw);
        if (apiFailure.kind === "notFound") {
          setStatus({
            kind: "linkProblem",
            problem: classifyIntakeLinkProblem(apiFailure.detail),
          });
        } else {
          setStatus({
            kind: "networkProblem",
            message: failureMessage(apiFailure, t),
          });
        }
      });
  }, [token, t]);

  useEffect(() => {
    // `status` already starts at "loading" — nothing to set synchronously here.
    // `load` only touches state from its `.then`/`.catch` callbacks.
    load();
  }, [load]);

  const retry = () => {
    setStatus({ kind: "loading" });
    load();
  };

  const onAnswerChange = (key: string, value: unknown) => {
    const next = { ...answers, [key]: value };
    setAnswers(next);
    if (form) saveIntakeDraft(token, form.definitionVersion, next);
    setFieldErrors((prev) => {
      if (!(key in prev)) return prev;
      const cleared = { ...prev };
      delete cleared[key];
      return cleared;
    });
  };

  const submit = async () => {
    if (!form || submitting) return;

    const clientErrors = validateIntakeAnswers(form.fields, answers);
    if (Object.keys(clientErrors).length > 0) {
      setFieldErrors(clientErrors);
      setGeneralError(null);
      setReloadNeeded(false);
      return;
    }

    setSubmitting(true);
    setFieldErrors({});
    setGeneralError(null);
    setReloadNeeded(false);

    try {
      await formsAPI.submitIntake(token, {
        definitionVersion: form.definitionVersion,
        answers,
      });
      clearIntakeDraft(token);
      setStatus({ kind: "success" });
    } catch (raw) {
      const apiFailure = toApiFailure(raw);

      if (apiFailure.kind === "notFound") {
        // The link died mid-fill — expired or was revoked while the form was open.
        setStatus({
          kind: "linkProblem",
          problem: classifyIntakeLinkProblem(apiFailure.detail),
        });
      } else if (apiFailure.kind === "invalid" && apiFailure.detail) {
        const { fields, general } = parseSubmitFaults(
          apiFailure.detail,
          form.fields.map((field) => field.key),
        );
        if (fields.has("definitionVersion")) {
          setReloadNeeded(true);
        } else {
          const mapped: Record<string, string> = {};
          for (const key of fields) mapped[key] = "intake_err_server";
          setFieldErrors(mapped);
          setGeneralError(general);
        }
      } else {
        setGeneralError(failureMessage(apiFailure, t));
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <IntakeShell>
      {status.kind === "loading" ? (
        <div className="flex justify-center py-10">
          <LoadingSpinner size="lg" label={t("intake_form_loading")} />
        </div>
      ) : status.kind === "linkProblem" ? (
        <IntakeLinkProblemView problem={status.problem} />
      ) : status.kind === "networkProblem" ? (
        <IntakeNetworkProblemView message={status.message} onRetry={retry} />
      ) : status.kind === "success" ? (
        <IntakeSuccessView />
      ) : form ? (
        <IntakeFormView
          form={form}
          answers={answers}
          onAnswerChange={onAnswerChange}
          fieldErrors={fieldErrors}
          generalError={generalError}
          reloadNeeded={reloadNeeded}
          submitting={submitting}
          draftRestored={draftRestored}
          onSubmit={submit}
        />
      ) : null}
    </IntakeShell>
  );
}
