import { useTranslation } from "react-i18next";
import type { IntakeAnswers, IntakeForm } from "../../../types/forms";
import { formatDate } from "../../../utils/format";
import { Button } from "../../ui";
import { IntakeFieldInput } from "./IntakeFieldInput";

export interface IntakeFormViewProps {
  form: IntakeForm;
  answers: IntakeAnswers;
  onAnswerChange: (key: string, value: unknown) => void;
  fieldErrors: Readonly<Record<string, string>>;
  generalError: string | null;
  reloadNeeded: boolean;
  submitting: boolean;
  draftRestored: boolean;
  onSubmit: () => void;
}

export function IntakeFormView({
  form,
  answers,
  onAnswerChange,
  fieldErrors,
  generalError,
  reloadNeeded,
  submitting,
  draftRestored,
  onSubmit,
}: IntakeFormViewProps) {
  const { t } = useTranslation();
  const hasErrors = Object.keys(fieldErrors).length > 0;

  return (
    <div>
      <p className="mb-1.5 text-eyebrow font-bold tracking-eyebrow uppercase text-telha">
        {t("intake_form_eyebrow")}
      </p>
      <h1 className="font-serif text-h3 leading-snug font-normal text-fg italic">
        {t("intake_form_title", { language: form.languageName })}
      </h1>
      <p className="mt-2 max-w-[50ch] text-small leading-normal text-fg-muted">
        {t("intake_form_lead")}
      </p>
      <p className="mt-1 text-tag text-fg-subtle">
        {t("intake_form_expires", { date: formatDate(form.expiresAt) })}
      </p>

      {draftRestored ? (
        <p className="mt-4 rounded-md bg-muted px-3.5 py-2.5 text-tag text-fg-muted">
          {t("intake_form_draft_restored")}
        </p>
      ) : null}

      <form
        className="mt-6 flex flex-col gap-5"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
      >
        {form.fields.map((field) => (
          <IntakeFieldInput
            key={field.key}
            field={field}
            value={answers[field.key]}
            onChange={(value) => onAnswerChange(field.key, value)}
            errorKey={fieldErrors[field.key]}
          />
        ))}

        {hasErrors ? (
          <p className="text-small font-semibold text-telha">
            {t("intake_form_check_answers")}
          </p>
        ) : null}

        {reloadNeeded ? (
          <div className="rounded-md border border-status-critical-line bg-accent-soft p-3.5">
            <p className="text-small font-semibold text-accent-press">
              {t("intake_form_reload_needed")}
            </p>
            <Button
              type="button"
              size="sm"
              className="mt-2.5"
              onClick={() => window.location.reload()}
            >
              {t("intake_form_reload")}
            </Button>
          </div>
        ) : null}

        {generalError && !reloadNeeded ? (
          <p className="text-small font-semibold text-telha">{generalError}</p>
        ) : null}

        <div>
          <Button type="submit" block disabled={submitting}>
            {submitting ? t("intake_submitting") : t("intake_submit")}
          </Button>
          <p className="mt-2.5 text-tag text-fg-subtle">
            {t("intake_form_offline_hint")}
          </p>
        </div>
      </form>
    </div>
  );
}
