import type { SubmissionApplyResult } from "../../../types/forms";
import type { RecordConflict } from "../../../types/projectRecord";
import type { ApiFailure } from "../../../types/session";

/**
 * Where applying one opened Pulse stands (OBT-652). The version is the record's as it was read
 * **when the Pulse was opened** — the moment the coordinator started deciding — never one read at
 * the click and sent straight back, which would be the `If-Match: *` the server refuses: a write
 * that does not know what it overwrites. *Applied* is not a step: it is the store row's
 * `appliedAt`, and while it is set this machine is not drawn at all.
 */
export type ApplyStep =
  | { kind: "reading" }
  | { kind: "unread"; failure: ApiFailure }
  | { kind: "ready"; version: string }
  | { kind: "conflict"; conflict: RecordConflict; version: string }
  | { kind: "failed"; failure: ApiFailure; version: string };

export type ApplyAction = { kind: "apply"; version: string } | { kind: "read" };

export interface ApplyButton {
  labelKey: string;
  /** `null` while nothing may be pressed — the button stays, `aria-disabled`, so focus stays on it. */
  action: ApplyAction | null;
}

/**
 * The step one attempt leaves behind. A conflict keeps the version the refusal carried — the record
 * as the panel describes it — so applying again overwrites what the coordinator was told about and
 * nothing newer: a further save is a further 409. Nothing here applies again by itself.
 */
export function afterAttempt(result: SubmissionApplyResult, quoted: string): ApplyStep {
  if (result.ok) return { kind: "ready", version: quoted };
  if (result.reason === "conflict") {
    return { kind: "conflict", conflict: result.conflict, version: result.version };
  }
  return { kind: "failed", failure: result.failure, version: quoted };
}

/**
 * What the one button says and does in each step. A refusal that carried no version has nothing
 * to quote, so its button reads the record again rather than resend a version known to be stale.
 */
export function buttonFor(step: ApplyStep, inFlight: boolean): ApplyButton {
  if (inFlight) return { labelKey: "forms_applying", action: null };
  switch (step.kind) {
    case "reading":
      return { labelKey: "forms_apply", action: null };
    case "unread":
      return { labelKey: "net_retry", action: { kind: "read" } };
    case "ready":
      return { labelKey: "forms_apply", action: { kind: "apply", version: step.version } };
    case "conflict":
      return {
        labelKey: "forms_apply_again",
        action: step.version ? { kind: "apply", version: step.version } : { kind: "read" },
      };
    case "failed":
      return { labelKey: "net_retry", action: { kind: "apply", version: step.version } };
  }
}
