import { useState } from "react";
import { useTranslation } from "react-i18next";
import { failureMessage, toApiFailure } from "../../../services/api";
import { FORM_TAG_LABEL_KEYS } from "../../../constants/forms";
import { surfaceOutlined } from "../../../styles";
import type { ReceivedSubmission, ReceivedSubmissionDetail } from "../../../types/forms";
import { cn } from "../../../utils/cn";
import { formatDate } from "../../../utils/format";
import { EmptyState } from "../../common/EmptyState";
import { Button } from "../../ui";
import { SubmissionAnswers } from "./SubmissionAnswers";

export interface ReceivedArchiveProps {
  submissions: readonly ReceivedSubmission[];
  /** Opens one submission's answers (OBT-580); without it the rows are the listing alone. */
  readSubmission?: (submissionId: string) => Promise<ReceivedSubmissionDetail>;
}

type Opened =
  | { kind: "loading" }
  | { kind: "failed"; message: string }
  | { kind: "read"; detail: ReceivedSubmissionDetail };

export function ReceivedArchive({ submissions, readSubmission }: ReceivedArchiveProps) {
  const { t } = useTranslation();
  const [opened, setOpened] = useState<Record<string, Opened>>({});

  const toggle = (id: string) => {
    if (!readSubmission) return;
    if (opened[id]) {
      setOpened((current) => {
        const next = { ...current };
        delete next[id];
        return next;
      });
      return;
    }
    setOpened((current) => ({ ...current, [id]: { kind: "loading" } }));
    readSubmission(id)
      .then((detail) => setOpened((current) => ({ ...current, [id]: { kind: "read", detail } })))
      .catch((raw: unknown) =>
        setOpened((current) => ({
          ...current,
          [id]: { kind: "failed", message: failureMessage(toApiFailure(raw), t) },
        })),
      );
  };

  return (
    <section className={cn("rounded-lg p-6 shadow-card", surfaceOutlined)}>
      <h2 className="mb-4 text-h4 leading-tight font-black tracking-tight text-fg-strong">
        {t("forms_received_title")}
      </h2>

      {submissions.length === 0 ? (
        <EmptyState message={t("forms_received_empty")} className="py-10" />
      ) : (
        <ul className="flex flex-col">
          {submissions.map((submission) => (
            <li
              key={submission.id}
              className="border-b border-line py-2.5 last:border-b-0"
            >
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
                <span className="shrink-0 text-tag font-bold tracking-button uppercase text-fg-muted">
                  {t(FORM_TAG_LABEL_KEYS[submission.kind])}
                </span>
                <span className="min-w-0 flex-1 text-small font-semibold wrap-anywhere text-fg-strong">
                  {submission.languageName}
                </span>
                <span className="shrink-0 text-tag tabular-nums text-fg-subtle">
                  {submission.submittedBy
                    ? `${submission.submittedBy} · `
                    : null}
                  {formatDate(submission.receivedAt)}
                </span>
                {readSubmission ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    aria-expanded={Boolean(opened[submission.id])}
                    onClick={() => toggle(submission.id)}
                  >
                    {t(opened[submission.id] ? "forms_submission_close" : "forms_submission_open")}
                  </Button>
                ) : null}
              </div>
              {opened[submission.id]?.kind === "loading" ? (
                <p className="mt-2 text-tag text-fg-subtle">{t("forms_submission_loading")}</p>
              ) : opened[submission.id]?.kind === "failed" ? (
                <p className="mt-2 text-tag font-semibold text-telha">
                  {(opened[submission.id] as { message: string }).message}
                </p>
              ) : opened[submission.id]?.kind === "read" ? (
                <div className="mt-3">
                  <SubmissionAnswers
                    detail={(opened[submission.id] as { detail: ReceivedSubmissionDetail }).detail}
                  />
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
