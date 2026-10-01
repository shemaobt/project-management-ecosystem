import { isPrayerVisibility } from "../constants/prayer";
import { HEALTH_LEVELS, PROJECT_STATUSES } from "../constants/project";
import { createEmptyProject } from "../fixtures/blank";
import type { Project } from "../types/project";

const REVOKE_DELAY_MS = 40_000;

/**
 * Hands a file to the browser's own download. **The export file itself is never assembled
 * here** since INT-11 (OBT-416): BE-14 builds it, so the privacy filters have one home, and
 * this only saves what the server sent.
 */
export function downloadBlob(fileName: string, blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), REVOKE_DELAY_MS);
}

export function downloadTextFile(
  fileName: string,
  content: string,
  mimeType: string,
): void {
  downloadBlob(fileName, new Blob([content], { type: mimeType }));
}

export type ImportError =
  | { key: "import_invalid_json" }
  | { key: "import_is_export" }
  | { key: "import_not_list" }
  | { key: "import_bad_record"; index: number }
  | { key: "import_duplicate_id"; id: string };

export type ImportParseResult =
  | { ok: true; projects: Project[] }
  | { ok: false; error: ImportError };

const isString = (value: unknown): value is string => typeof value === "string";
const isFiniteNumber = (value: unknown): boolean =>
  typeof value === "number" && Number.isFinite(value);
const isBoolean = (value: unknown): boolean => typeof value === "boolean";

const isPlainRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isOneOf =
  (vocabulary: readonly string[]) =>
  (value: unknown): boolean =>
    isString(value) && vocabulary.includes(value);

const isHealthRating = (value: unknown): boolean =>
  value === "" || isOneOf(HEALTH_LEVELS)(value);

const isCoordinatePair = (value: unknown): boolean =>
  Array.isArray(value) && value.length === 2 && value.every(isFiniteNumber);

const isListOf =
  (accepts: (item: unknown) => boolean) =>
  (value: unknown): boolean =>
    Array.isArray(value) && value.every(accepts);

const recordWithStrings =
  (fields: readonly string[]) =>
  (item: unknown): boolean =>
    isPlainRecord(item) &&
    fields.every((field) => item[field] === undefined || isString(item[field]));

const IMPORT_FIELD_CHECKS: ReadonlyArray<
  readonly [keyof Project, (value: unknown) => boolean]
> = [
  ["languageCode", isString],
  ["location", isString],
  ["team", isString],
  ["ywamBase", isString],
  ["notes", isString],
  ["healthNotes", isString],
  ["prayerRequests", isString],
  ["prayerRequestsAudio", isString],
  ["healthAssessmentDate", isString],
  ["healthAssessor", isString],
  ["startDate", isString],
  ["deadline", isString],
  ["lastUpdated", isString],
  ["status", isOneOf(PROJECT_STATUSES)],
  ["prayerVisibility", (value) => isString(value) && isPrayerVisibility(value)],
  ["healthEmotional", isHealthRating],
  ["healthRelational", isHealthRating],
  ["healthSpiritual", isHealthRating],
  ["healthPhysical", isHealthRating],
  ["coords", isCoordinatePair],
  ["objective", isListOf(isString)],
  ["translationType", isListOf(isString)],
  ["financialResources", isListOf(isString)],
  [
    "needsItems",
    isListOf(recordWithStrings(["description", "category", "urgency", "status"])),
  ],
  ["progressHistory", isListOf(recordWithStrings(["date"]))],
  ["bookProgress", isListOf(recordWithStrings(["id", "name"]))],
  ["storyProgress", isListOf(recordWithStrings(["name"]))],
  ["otherProgress", isListOf(recordWithStrings(["name"]))],
  [
    "materials",
    isListOf(
      recordWithStrings(["kind", "scope", "link", "fileName", "dataUrl", "format"]),
    ),
  ],
  ["phases", isListOf(recordWithStrings(["label", "scope", "date"]))],
  ["mediaVideos", isListOf(recordWithStrings(["url", "caption"]))],
  ["mediaPhotos", isListOf(recordWithStrings(["caption"]))],
  ["totalUnits", isFiniteNumber],
  ["translatedUnits", isFiniteNumber],
  ["communityCheckedUnits", isFiniteNumber],
  ["approvedUnits", isFiniteNumber],
  ["sensitiveCountry", isBoolean],
  ["inETEN", isBoolean],
];

type ImportedRecord = Partial<Project> & Pick<Project, "id" | "languageName">;

function isImportableRecord(entry: unknown): entry is ImportedRecord {
  if (typeof entry !== "object" || entry === null || Array.isArray(entry)) {
    return false;
  }
  const record = entry as Record<string, unknown>;
  if (!isString(record.id) || record.id.trim() === "") return false;
  if (!isString(record.languageName) || record.languageName.trim() === "") {
    return false;
  }
  return IMPORT_FIELD_CHECKS.every(
    ([field, accepts]) => record[field] === undefined || accepts(record[field]),
  );
}

function looksLikeExportFile(parsed: unknown): boolean {
  return (
    typeof parsed === "object" &&
    parsed !== null &&
    !Array.isArray(parsed) &&
    Array.isArray((parsed as { projects?: unknown }).projects)
  );
}

export function parseProjectsImport(raw: string): ImportParseResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, error: { key: "import_invalid_json" } };
  }
  if (looksLikeExportFile(parsed)) {
    return { ok: false, error: { key: "import_is_export" } };
  }
  if (!Array.isArray(parsed)) {
    return { ok: false, error: { key: "import_not_list" } };
  }
  const projects: Project[] = [];
  const seen = new Set<string>();
  for (const [index, entry] of parsed.entries()) {
    if (!isImportableRecord(entry)) {
      return { ok: false, error: { key: "import_bad_record", index: index + 1 } };
    }
    if (seen.has(entry.id)) {
      return { ok: false, error: { key: "import_duplicate_id", id: entry.id } };
    }
    seen.add(entry.id);
    projects.push({ ...createEmptyProject(entry.id), ...entry });
  }
  return { ok: true, projects };
}
