import { RECORD_TABS, type RecordTabId } from "../constants/recordTabs";
import {
  allWritableFields,
  PENDING_WRITE,
  SERVER_WRITABLE,
  tabOf,
} from "../constants/recordFields";
import type { Project } from "../types/project";
import type {
  RecordConflict,
  RecordField,
  RecordFieldError,
} from "../types/projectRecord";
import { reconcileFiledNeeds } from "../utils/needs";
import {
  readsFreeText,
  writableDraft,
  type RecordAccess,
} from "../utils/recordAccess";

function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (value === null || typeof value !== "object") return value;
  const entries = Object.entries(value as Record<string, unknown>);
  return Object.fromEntries(
    entries
      .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
      .map(([key, item]) => [key, canonical(item)]),
  );
}

/**
 * A field whose two values differ — `JSON` because half of them are arrays, and with the keys
 * sorted because key order is not a difference: the server answers a book row in its model's
 * field order (`{name, …, id}`) and the progress tab builds it `{id, name, …}` (OBT-625).
 */
function differs(left: unknown, right: unknown): boolean {
  if (left === right) return false;
  return (
    JSON.stringify(canonical(left ?? null)) !==
    JSON.stringify(canonical(right ?? null))
  );
}

/**
 * What a save is about to send: the fields the coordinator changed, and nothing else.
 *
 * This is the whole of *save what changed, per tab, not the record* — a field a tab did
 * not touch never travels, so tab 3 cannot write tab 7's values as they stood when tab
 * 3 was opened. It is a **diff**, not a tab cut: cutting by tab would either still send
 * that tab's untouched fields (the same overwrite, one tab narrower) or need one
 * request per tab, and a twenty-row progress table has to be one write with one result.
 */
export function changedFields(
  draft: Partial<Project>,
  saved: Project | null,
): RecordField[] {
  return allWritableFields().filter(
    (field) =>
      field in draft && (saved === null || differs(draft[field], saved[field])),
  );
}

/**
 * Fields a tab still edits that this endpoint does not take — kept, never reported.
 *
 * It reads the **typed** draft, not the merged values: the merge carries every field of
 * the record, so asking it would report the whole pending list on every save and promise
 * to keep input nobody entered.
 */
export function withheldFields(typed: Partial<Project>): RecordField[] {
  return RECORD_TABS.flatMap((tab) => PENDING_WRITE[tab]?.fields ?? []).filter(
    (field) => field in typed && !SERVER_WRITABLE.has(field),
  );
}

/** The tabs a save actually wrote, in the record's own order. */
export function tabsOf(fields: readonly RecordField[]): RecordTabId[] {
  return RECORD_TABS.filter((tab) =>
    fields.some((field) => tabOf(field) === tab),
  );
}

/** The tab a refusal points at, so a blocked save can land the reader on it. */
export function tabOfFirstError(
  errors: readonly RecordFieldError[],
): RecordTabId | null {
  for (const error of errors) {
    const tab = error.field ? tabOf(error.field) : null;
    if (tab) return tab;
  }
  return null;
}

/**
 * A conflict, read against what this coordinator had typed.
 *
 * The overlap is the sentence that matters: *somebody else changed this record* can be
 * answered by pressing save again, while *you and Maria both changed the status* cannot
 * be answered without a person looking at it. Both are said, and neither decides
 * anything.
 */
export function overlappingFields(
  conflict: RecordConflict,
  draft: Partial<Project>,
): RecordField[] {
  return conflict.changedFields.filter((field) => field in draft);
}

/**
 * What a draft holds that the record its own lost create filed does not (OBT-625).
 *
 * Read as this reader may write it (`writableDraft`), and compared on what was **typed**,
 * never on the merge: a field nobody typed is never carried over somebody's later edit, and a
 * field equal to the record is not carried either, because an overlay that repeats the record
 * only hides the next change underneath it. The needs go through `reconcileFiledNeeds`, since
 * the record's carry the ids and stamps the draft never had. `withheld` is what the record
 * write does not take yet, carried as a create carries it.
 */
export function filedDraft(
  typed: Partial<Project>,
  filed: Project,
  access: RecordAccess,
): { carried: Partial<Project>; pending: RecordField[]; withheld: RecordField[] } {
  const mine = writableDraft(typed, access, filed);
  const needs = mine.needsItems
    ? reconcileFiledNeeds(mine.needsItems, filed.needsItems, readsFreeText(access))
    : null;
  const compared = { ...mine, needsItems: needs ?? filed.needsItems };
  const pending = changedFields(compared, filed);
  const withheld = withheldFields(typed);

  const carried: Partial<Project> = {};
  for (const field of pending) Object.assign(carried, { [field]: compared[field] });
  for (const field of withheld) Object.assign(carried, { [field]: typed[field] });
  return { carried, pending, withheld };
}
