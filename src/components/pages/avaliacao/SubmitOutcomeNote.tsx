import { useTranslation } from "react-i18next";
import { failureMessage } from "../../../services/api";
import type { RecordFieldError } from "../../../types/projectRecord";
import type { ApiFailure } from "../../../types/session";

/**
 * What the last submit attempt said — read once at the point where the button lives,
 * never after navigating away, which is what "at submission time" means for a refusal.
 * No `"conflict"`: appending a reading has none to race against (BE-07's own argument
 * for skipping `If-Match`, `app/services/shema/append_assessment.py`).
 */
export type SubmitOutcome =
  | { kind: "invalid"; errors: RecordFieldError[] }
  | { kind: "failed"; failure: ApiFailure };

export interface SubmitOutcomeNoteProps {
  outcome: SubmitOutcome;
}

/**
 * The wizard's own refusal note — same tone as the ficha's `SaveOutcomeNote`, narrower:
 * one endpoint, two ways to fail, and the promise stays identical either way — **the
 * conversation you just had is still here**, unlike a discarded draft. The Save button
 * itself is the retry; this note never disables it.
 */
export function SubmitOutcomeNote({ outcome }: SubmitOutcomeNoteProps) {
  const { t } = useTranslation();

  return (
    <div
      role="status"
      className="flex flex-col gap-2 rounded-md border-l-4 border-telha bg-accent-soft px-4.5 py-3.5 text-small leading-[1.45] text-fg"
    >
      <strong className="font-semibold">
        {outcome.kind === "failed"
          ? failureMessage(outcome.failure, t)
          : t("net_invalid")}
      </strong>
      <p>{t("record_save_failed")}</p>
      {outcome.kind === "invalid" && outcome.errors.length > 0 ? (
        <ul className="flex flex-col gap-1">
          {outcome.errors.map((error, index) => (
            <li key={index}>{error.message}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
