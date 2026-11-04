import { useTranslation } from "react-i18next";
import { tabOf } from "../../../constants/recordFields";
import type { RecordTabId } from "../../../constants/recordTabs";
import { failureMessage } from "../../../services/api";
import type { SaveOutcome } from "../../../stores/projectRecordStore";
import type { RecordField, RecordFieldError } from "../../../types/projectRecord";
import { OutcomePanel as Panel } from "../../common/OutcomePanel";
import { Button } from "../../ui";
import { conflictSentence, fieldList, savedSentence } from "./saveReport";

export interface SaveOutcomeNoteProps {
  outcome: SaveOutcome;
  saving: boolean;
  onRetry: () => void;
  onGoToTab: (tab: RecordTabId) => void;
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

  const fieldName = (field: RecordField): string => fieldList([field], t);

  const list = (fields: readonly RecordField[]) => fieldList(fields, t);

  const action = (label: string) => (
    <div>
      <Button size="sm" onClick={onRetry} disabled={saving}>
        {saving ? t("record_saving") : label}
      </Button>
    </div>
  );
  const retry = action(t("record_save_retry"));

  switch (outcome.kind) {
    case "conflict": {
      const { conflict, overlap } = outcome;
      return (
        <Panel tone="attention" title={t("record_conflict_title")}>
          <p>{t("record_conflict_kept")}</p>
          <p>{conflictSentence(conflict, t)}</p>
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

    case "landed": {
      const kept = savedSentence([], outcome.withheld, t);
      return (
        <Panel tone="quiet" title={t("record_landed_title")}>
          <p>{t("record_landed_body")}</p>
          {outcome.pending.length > 0 && (
            <>
              <p className="font-semibold">
                {t("record_landed_pending", { fields: list(outcome.pending) })}
              </p>
              {action(t("record_landed_apply"))}
            </>
          )}
          {kept && <p>{kept}</p>}
        </Panel>
      );
    }

    case "landedUnread":
      // The 409 proved the record exists, so a 404 here is reach, never absence — and the
      // read's own sentence would say the opposite. Out of reach answers the same every time.
      return (
        <Panel tone="quiet" title={t("record_landed_title")}>
          {outcome.failure.kind === "notFound" ? (
            <p>{t("record_landed_unreachable")}</p>
          ) : (
            <>
              <p>{t("record_landed_unread")}</p>
              <p>{failureMessage(outcome.failure, t)}</p>
              {action(t("net_retry"))}
            </>
          )}
        </Panel>
      );

    case "failed":
      return (
        <Panel tone="quiet" title={failureMessage(outcome.failure, t)}>
          <p>{t("record_save_failed")}</p>
          {retry}
        </Panel>
      );

    default:
      return null;
  }
}
