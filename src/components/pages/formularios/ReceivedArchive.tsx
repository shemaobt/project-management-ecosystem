import { useTranslation } from "react-i18next";
import { FORM_TAG_LABEL_KEYS } from "../../../constants/forms";
import { surfaceOutlined } from "../../../styles";
import type { ReceivedSubmission } from "../../../types/forms";
import { cn } from "../../../utils/cn";
import { formatDate } from "../../../utils/format";
import { EmptyState } from "../../common/EmptyState";

export interface ReceivedArchiveProps {
  submissions: readonly ReceivedSubmission[];
}

export function ReceivedArchive({ submissions }: ReceivedArchiveProps) {
  const { t } = useTranslation();

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
              className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 border-b border-line py-2.5 last:border-b-0"
            >
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
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
