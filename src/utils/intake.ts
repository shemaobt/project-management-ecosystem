import type { IntakeAnswers, IntakeField } from "../types/forms";

// --- the draft the leader is filling — local to this device, never a store shared
// across routes (§8: "keep state local; lift to Zustand only when shared") -----------

const DRAFT_KEY = "shema-intake-draft-v1";

/** How many links' worth of draft this device keeps at once, oldest dropped first. */
const MAX_DRAFTS = 5;

export interface IntakeDraft {
  definitionVersion: number;
  answers: IntakeAnswers;
}

interface StoredDraft extends IntakeDraft {
  savedAt: string;
}

type DraftMap = Record<string, StoredDraft>;

function readAll(): DraftMap {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    return raw ? (JSON.parse(raw) as DraftMap) : {};
  } catch {
    return {};
  }
}

function writeAll(drafts: DraftMap): boolean {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(drafts));
    return true;
  } catch {
    return false;
  }
}

export function loadIntakeDraft(token: string): IntakeDraft | null {
  const draft = readAll()[token];
  return draft
    ? { definitionVersion: draft.definitionVersion, answers: draft.answers }
    : null;
}

/** Persists the draft under `token`, or answers `false` when storage refused it. */
export function saveIntakeDraft(
  token: string,
  definitionVersion: number,
  answers: IntakeAnswers,
): boolean {
  const drafts = readAll();
  drafts[token] = {
    definitionVersion,
    answers,
    savedAt: new Date().toISOString(),
  };
  const oldest = Object.keys(drafts).sort((a, b) =>
    drafts[a].savedAt < drafts[b].savedAt ? 1 : -1,
  );
  for (const stale of oldest.slice(MAX_DRAFTS)) delete drafts[stale];
  return writeAll(drafts);
}

/** Wipes this link's draft — the "nothing cached after submission" rule. */
export function clearIntakeDraft(token: string): void {
  const drafts = readAll();
  if (!(token in drafts)) return;
  delete drafts[token];
  writeAll(drafts);
}

// --- client-side validation — a first pass, so a phone on a bad connection is not the
// only place a required field is noticed. The server's own answer still governs. ------

function isEmptyAnswer(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === "string") return value.trim() === "";
  if (Array.isArray(value)) return value.length === 0;
  return false;
}

const PERIOD_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

/** One i18n key per field that fails — never the field's fault text, which is English. */
export function validateIntakeAnswers(
  fields: readonly IntakeField[],
  answers: IntakeAnswers,
): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const field of fields) {
    const value = answers[field.key];
    if (isEmptyAnswer(value)) {
      if (field.required) errors[field.key] = "intake_err_required";
      continue;
    }
    if (field.type === "period" && !PERIOD_PATTERN.test(String(value))) {
      errors[field.key] = "intake_err_period";
    }
    if (
      (field.type === "text" || field.type === "longText") &&
      field.maxLength !== null &&
      String(value).length > field.maxLength
    ) {
      errors[field.key] = "intake_err_too_long";
    }
    if (field.type === "choice" && !field.options.includes(String(value))) {
      errors[field.key] = "intake_err_choice";
    }
  }
  return errors;
}

// --- reading the server's refusal back — it rejects a submission whole, naming every
// fault at once (`app/services/shema/_form_validation.py`), joined as
// "<header> — key1: msg1; key2: msg2". Splitting it back out is what lets each fault
// land on its own field instead of one unreadable paragraph. -------------------------

export interface SubmitFaults {
  /** Which known field keys were named, `definitionVersion` included. */
  fields: ReadonlySet<string>;
  /** The raw detail, shown once when no fault could be pinned to a field. */
  general: string | null;
}

export function parseSubmitFaults(
  detail: string,
  knownKeys: readonly string[],
): SubmitFaults {
  const dash = detail.indexOf(" — ");
  const part = dash >= 0 ? detail.slice(dash + 3) : detail;
  const known = new Set([...knownKeys, "definitionVersion"]);
  const fields = new Set<string>();

  for (const segment of part.split("; ")) {
    const colon = segment.indexOf(": ");
    if (colon <= 0) continue;
    const key = segment.slice(0, colon).trim();
    if (known.has(key)) fields.add(key);
  }

  return { fields, general: fields.size > 0 ? null : detail };
}

// --- the three ways a link can fail to open, told apart by the server's own words ---

export type IntakeLinkProblem = "revoked" | "expired" | "invalid";

export function classifyIntakeLinkProblem(
  detail: string | null,
): IntakeLinkProblem {
  if (detail && /revoked/i.test(detail)) return "revoked";
  if (detail && /expired/i.test(detail)) return "expired";
  return "invalid";
}
