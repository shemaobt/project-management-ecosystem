import { useLayoutEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { failureMessage, toApiFailure } from "../../../services/api";
import { FORM_TAG_LABEL_KEYS } from "../../../constants/forms";
import { surfaceOutlined } from "../../../styles";
import type { ReceivedSubmission, ReceivedSubmissionDetail } from "../../../types/forms";
import { cn } from "../../../utils/cn";
import { formatDate } from "../../../utils/format";
import { focusIsLost, scheduleFocusRescue } from "../../../utils/focus";
import { getLanguageNameDisplay } from "../../../utils/region";
import { EmptyState } from "../../common/EmptyState";
import { Button } from "../../ui";
import { AppliedNote, PulseApply, type PulseApplyAccess } from "./PulseApply";
import { SubmissionAnswers } from "./SubmissionAnswers";

export interface ReceivedArchiveProps {
  submissions: readonly ReceivedSubmission[];
  /** Opens one submission's answers (OBT-580); without it the rows are the listing alone. */
  readSubmission?: (submissionId: string) => Promise<ReceivedSubmissionDetail>;
  apply?: PulseApplyAccess;
}

type Opened =
  | { kind: "loading" }
  | { kind: "failed"; message: string }
  | { kind: "read"; detail: ReceivedSubmissionDetail };

export function ReceivedArchive({ submissions, readSubmission, apply }: ReceivedArchiveProps) {
  const { t } = useTranslation();
  const [opened, setOpened] = useState<Record<string, Opened>>({});
  const listRef = useRef<HTMLUListElement>(null);
  const focusAfterApply = useRef<string | null>(null);

  // The apply button leaves with the row's flip to *applied*; focus goes to the link that took its
  // place, unless the reader moved on meanwhile (§7.5: never left on <body>).
  useLayoutEffect(() => {
    const id = focusAfterApply.current;
    if (!id || !submissions.some((row) => row.id === id && row.appliedAt)) return;
    focusAfterApply.current = null;
    const host = { activeElement: document.activeElement, body: document.body, anchor: () => null };
    if (!focusIsLost(host)) return;
    const link = listRef.current?.querySelector<HTMLElement>(
      `[data-applied-link="${CSS.escape(id)}"]`,
    );
    if (link) link.focus();
    else scheduleFocusRescue();
  });

  // Once applied, the server answers only what the record did not take, so the open detail is
  // read again rather than left showing answers the archive no longer serves.
  const reread = (id: string) => {
    readSubmission?.(id)
      .then((detail) =>
        setOpened((current) =>
          current[id] ? { ...current, [id]: { kind: "read", detail } } : current,
        ),
      )
      .catch(() => undefined);
  };

  const access: PulseApplyAccess | undefined = apply && {
    ...apply,
    submit: (id, version) => {
      focusAfterApply.current = id;
      return apply.submit(id, version).then((result) => {
        if (result.ok) reread(id);
        else focusAfterApply.current = null;
        return result;
      });
    },
  };

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
        <ul ref={listRef} className="flex flex-col">
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
                  {getLanguageNameDisplay(submission, t)}
                </span>
                <span className="shrink-0 text-tag tabular-nums text-fg-subtle">
                  {submission.submittedBy
                    ? `${submission.submittedBy} · `
                    : null}
                  {formatDate(submission.receivedAt)}
                </span>
                <span
                  className={cn(
                    "shrink-0 text-tag",
                    submission.appliedAt
                      ? "font-semibold text-verde-claro-ink"
                      : "text-fg-subtle",
                  )}
                >
                  {submission.appliedAt
                    ? t("forms_applied_on", { date: formatDate(submission.appliedAt) })
                    : t("forms_not_applied")}
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
              <OpenedAnswers state={opened[submission.id]} />
              {opened[submission.id]?.kind === "read" ? (
                <ApplySlot submission={submission} access={access} />
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/**
 * Below an opened Pulse: where it stands with the record. Applied is the row's own fact, so a Pulse
 * applied by anybody — or answered applied by the server's idempotent no-op — offers no second
 * apply; a reader the route refuses is offered nothing.
 */
export function ApplySlot({
  submission,
  access,
}: {
  submission: ReceivedSubmission;
  access?: PulseApplyAccess;
}) {
  if (submission.appliedAt) {
    return <AppliedNote submission={{ ...submission, appliedAt: submission.appliedAt }} />;
  }
  if (!access?.allows(submission)) return null;
  return <PulseApply submission={submission} access={access} />;
}

function OpenedAnswers({ state }: { state: Opened | undefined }) {
  const { t } = useTranslation();
  if (!state) return null;
  if (state.kind === "loading") {
    return <p className="mt-2 text-tag text-fg-subtle">{t("forms_submission_loading")}</p>;
  }
  if (state.kind === "failed") {
    return <p className="mt-2 text-tag font-semibold text-telha">{state.message}</p>;
  }
  return (
    <div className="mt-3">
      <SubmissionAnswers detail={state.detail} />
    </div>
  );
}
