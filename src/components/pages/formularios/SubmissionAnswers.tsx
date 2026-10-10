import { useTranslation } from "react-i18next";
import type { IntakeField, ReceivedSubmissionDetail } from "../../../types/forms";

export interface SubmissionAnswersProps {
  detail: ReceivedSubmissionDetail;
}

function isRecordList(value: unknown): value is readonly Record<string, unknown>[] {
  return Array.isArray(value);
}

/**
 * One Pulse's answers, by the form it answered (OBT-580). The image never shows here: the
 * server serves no bytes yet, so the inbox says whether one was attached, reads its
 * description and the leader's answer to the box, and nothing more. A withheld reader is
 * given no answers at all, and the one sentence says so instead of an empty list.
 */
export function SubmissionAnswers({ detail }: SubmissionAnswersProps) {
  const { t } = useTranslation();

  if (detail.answersWithheld) {
    return <p className="text-small text-fg-muted">{t("forms_submission_withheld")}</p>;
  }

  const render = (field: IntakeField): string => {
    const value = detail.answers[field.key];
    switch (field.type) {
      case "image":
        return typeof value === "string" && value
          ? t("forms_submission_image_attached")
          : t("forms_submission_image_none");
      case "checkbox":
        return value === true ? t("forms_answer_yes") : t("forms_answer_no");
      case "progressRows":
        return isRecordList(value) && value.length > 0
          ? t("forms_submission_rows", { count: value.length })
          : t("forms_answer_empty");
      default:
        return typeof value === "string" && value.trim() ? value : t("forms_answer_empty");
    }
  };

  return (
    <dl className="grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-[max-content_1fr]">
      {detail.fields.map((field) => (
        <div key={field.key} className="contents">
          <dt className="text-tag font-bold tracking-button uppercase text-fg-muted">
            {t(field.labelKey)}
          </dt>
          <dd className="text-small whitespace-pre-wrap text-fg">{render(field)}</dd>
        </div>
      ))}
    </dl>
  );
}
