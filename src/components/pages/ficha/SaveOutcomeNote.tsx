import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { FIELD_LABEL_KEYS, tabOf } from "../../../constants/recordFields";
import type { RecordTabId } from "../../../constants/recordTabs";
import { failureMessage } from "../../../services/api";
import type { SaveOutcome } from "../../../stores/projectRecordStore";
import type { RecordField, RecordFieldError } from "../../../types/projectRecord";
import { cn } from "../../../utils/cn";
import { formatDate } from "../../../utils/format";
import { Button } from "../../ui";

export interface SaveOutcomeNoteProps {
  outcome: SaveOutcome;
  saving: boolean;
  onRetry: () => void;
  onGoToTab: (tab: RecordTabId) => void;
}

type Tone = "conflict" | "refused" | "failed";

const TONES: Record<Tone, string> = {
  conflict: "border-status-attention-fg bg-status-attention-bg",
  refused: "border-telha bg-accent-soft",
  failed: "border-line-strong bg-muted",
};

function Panel({
  tone,
  title,
  children,
}: {
  tone: Tone;
  title: string;
  children: ReactNode;
}) {
  return (
    <div
      role="status"
      className={cn(
        "flex flex-col gap-2 rounded-md border-l-4 px-4.5 py-3.5 text-small leading-[1.45] text-fg",
        TONES[tone],
      )}
    >
      <strong className="font-semibold">{title}</strong>
      {children}
    </div>
  );
}

function ErrorLine({
  error,
  label,
  onGoToTab,
}: {
  error: RecordFieldError;
  label: string | null;
  onGoToTab: (tab: RecordTabId) => void;
}) {
  const { t } = useTranslation();
  const tab = error.field ? tabOf(error.field) : null;
  const where = [
    label ?? t("record_invalid_unlocated"),
    error.index === null
      ? null
      : t("record_invalid_row", { n: error.index + 1 }),
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <>
      {tab ? (
        <button
          type="button"
          onClick={() => onGoToTab(tab)}
          className="font-semibold underline underline-offset-2"
        >
          {where}
        </button>
      ) : (
        <strong className="font-semibold">{where}</strong>
      )}{" "}
      <span>{error.message}</span>
    </>
  );
}

/**
 * What the last save attempt did, said where the person who pressed save is looking.
 *
 * Every branch repeats the same promise in its own words, because it is the promise
 * this screen exists to keep: **the draft was not touched**. A coordinator who loses an
 * afternoon's counting to a refused save goes back to the spreadsheet, so the sentence
 * is not a footnote.
 */
export function SaveOutcomeNote({
  outcome,
  saving,
  onRetry,
  onGoToTab,
}: SaveOutcomeNoteProps) {
  const { t } = useTranslation();

  const fieldName = (field: RecordField): string => {
    const key = FIELD_LABEL_KEYS[field];
    return key ? t(key) : field;
  };

  const list = (fields: readonly RecordField[], extra: readonly string[] = []) =>
    [...fields.map(fieldName), ...extra].join(" · ");

  const retry = (
    <div>
      <Button size="sm" onClick={onRetry} disabled={saving}>
        {saving ? t("record_saving") : t("record_save_retry")}
      </Button>
    </div>
  );

  switch (outcome.kind) {
    case "conflict": {
      const { conflict, overlap } = outcome;
      const named =
        conflict.changedFields.length > 0 || conflict.unknownFields.length > 0;
      return (
        <Panel tone="conflict" title={t("record_conflict_title")}>
          <p>{t("record_conflict_kept")}</p>
          <p>
            {conflict.changedBy
              ? t("record_conflict_by", {
                  name: conflict.changedBy,
                  date: conflict.changedAt
                    ? formatDate(conflict.changedAt)
                    : "—",
                })
              : t("record_conflict_by_unnamed")}{" "}
            {named
              ? t("record_conflict_changed", {
                  fields: list(conflict.changedFields, conflict.unknownFields),
                })
              : t("record_conflict_changed_unknown")}
          </p>
          <p className="font-semibold">
            {overlap.length > 0
              ? t("record_conflict_overlap", { fields: list(overlap) })
              : t("record_conflict_no_overlap")}
          </p>
          {retry}
        </Panel>
      );
    }

    case "invalid":
      return (
        <Panel tone="refused" title={t("record_invalid_title")}>
          <p>{t("record_invalid_nothing")}</p>
          {outcome.errors.length === 0 ? (
            <p>{t("net_invalid")}</p>
          ) : (
            <ul className="flex flex-col gap-1">
              {outcome.errors.map((error, index) => (
                <li key={index}>
                  <ErrorLine
                    error={error}
                    label={error.field ? fieldName(error.field) : null}
                    onGoToTab={onGoToTab}
                  />
                </li>
              ))}
            </ul>
          )}
        </Panel>
      );

    case "failed":
      return (
        <Panel tone="failed" title={failureMessage(outcome.failure, t)}>
          <p>{t("record_save_failed")}</p>
          {retry}
        </Panel>
      );

    default:
      return null;
  }
}
