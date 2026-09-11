import type { RecordTabId } from "../constants/recordTabs";
import type { Project } from "./project";

/** A field of the record a tab may write — never `id`, `derived` or `progressHistory`. */
export type RecordField = keyof Project;

/**
 * A record as the server holds it, with the version its next save has to quote.
 *
 * `version` is the ETag verbatim, quotes and all: it is handed straight back as
 * `If-Match` and never parsed, so a server that changes how it spells a version costs
 * this client nothing. `RecordConflict.currentVersion` is the one place a number is
 * read out of it, and only because the 409's body states it separately.
 */
export interface LoadedRecord {
  project: Project;
  version: string;
}

/**
 * What the 409 carries — *who* moved *what*, so the screen can say more than "reload".
 *
 * `changedFields` are the record's own field names, already mapped from the wire keys
 * the server sends; anything this client does not recognise lands in `unknownFields`
 * and is rendered verbatim rather than dropped, because a conflict that hides half of
 * what moved is worse than one that names a key nobody labelled yet.
 */
export interface RecordConflict {
  expectedVersion: number | null;
  currentVersion: number | null;
  changedFields: RecordField[];
  unknownFields: string[];
  changedBy: string;
  changedAt: string | null;
  detail: string | null;
}

/**
 * One refusal from the server's own validation, located.
 *
 * `field` is `null` when the server pointed at something this client cannot place —
 * the message still shows, under the record rather than under a field. `index` is the
 * row of a progress table, which is what makes a rejected batch legible: every bad row
 * is named at once, by position, and none of them was applied.
 */
export interface RecordFieldError {
  field: RecordField | null;
  index: number | null;
  message: string;
}

/**
 * What a save actually did — the toast's one source, and what the draft settles against.
 *
 * `writtenFields` is what the server took and is therefore what the draft may forget;
 * `withheld` is what it does not accept yet and the draft keeps. `written` is the same
 * fields read as tabs, which is how a person names where they were working.
 */
export interface RecordSaveReport {
  written: RecordTabId[];
  writtenFields: RecordField[];
  withheld: RecordField[];
}
