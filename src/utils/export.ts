import type { TFunction } from "i18next";
import { HEALTH_LABEL_KEYS, STATUS_LABEL_KEYS } from "../constants/status";
import { createEmptyProject } from "../fixtures/blank";
import type { Project } from "../types/project";
import { toLocalIsoDate } from "./format";
import {
  countWithheldLocations,
  redactProjectsForExport,
  type ExportedProject,
} from "./privacy";

export interface ProjectsExport {
  contains: string;
  confidential: string;
  generatedAt: string;
  projectCount: number;
  locationsWithheld: number;
  withheldNote: string | null;
  records: ExportedProject[];
}

export type ExportFormat = "json" | "csv";

function exportTimestamp(now: Date): string {
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  return `${toLocalIsoDate(now)} ${hours}:${minutes}`;
}

export function buildProjectsExport(
  projects: readonly Project[],
  t: TFunction,
  now: Date = new Date(),
): ProjectsExport {
  const records = redactProjectsForExport(projects, t);
  const withheld = countWithheldLocations(records);
  return {
    contains: t("export_contains"),
    confidential: t("export_confidential"),
    generatedAt: exportTimestamp(now),
    projectCount: records.length,
    locationsWithheld: withheld,
    withheldNote:
      withheld > 0 ? t("export_withheld_count", { count: withheld }) : null,
    records,
  };
}

export function exportFileName(
  format: ExportFormat,
  now: Date = new Date(),
): string {
  return `shema-projetos-${toLocalIsoDate(now)}.${format}`;
}

export function toJsonExport(data: ProjectsExport): string {
  const { records, ...meta } = data;
  return JSON.stringify({ meta, projects: records }, null, 2);
}

export const CSV_BOM = "\uFEFF";

export const CSV_SEPARATOR = ";";

const FORMULA_LEAD = /^[=+\-@\t\r]/u;
const NEEDS_QUOTING = /[";\n\r]/u;

function csvCell(value: string | number): string {
  const text = String(value);
  const guarded = FORMULA_LEAD.test(text) ? `'${text}` : text;
  if (NEEDS_QUOTING.test(guarded)) {
    return `"${guarded.replaceAll('"', '""')}"`;
  }
  return guarded;
}

const CSV_JOIN = " · ";

interface CsvColumn {
  headerKey: string;
  cell: (record: ExportedProject, t: TFunction) => string | number;
}

const CSV_COLUMNS: readonly CsvColumn[] = [
  { headerKey: "export_col_id", cell: (record) => record.id },
  { headerKey: "f_lang_name", cell: (record) => record.languageName },
  { headerKey: "f_lang_code", cell: (record) => record.languageCode },
  { headerKey: "f_bridge", cell: (record) => record.bridgeLanguage },
  { headerKey: "f_vitality", cell: (record) => record.vitalityStatus },
  { headerKey: "f_speakers", cell: (record) => record.speakerCount },
  { headerKey: "sb_team", cell: (record) => record.base },
  { headerKey: "f_location", cell: (record) => record.location },
  {
    headerKey: "sb_sensitive",
    cell: (record, t) => t(record.sensitiveCountry ? "bool_yes" : "bool_no"),
  },
  { headerKey: "sb_objective", cell: (record) => record.objective.join(CSV_JOIN) },
  {
    headerKey: "f_translation_type",
    cell: (record) => record.translationType.join(CSV_JOIN),
  },
  {
    headerKey: "sb_status",
    cell: (record, t) => t(STATUS_LABEL_KEYS[record.status]),
  },
  { headerKey: "f_start", cell: (record) => record.startDate },
  { headerKey: "f_deadline", cell: (record) => record.deadline },
  { headerKey: "d_p_translated_short", cell: (record) => record.translatedUnits },
  {
    headerKey: "d_p_community_short",
    cell: (record) => record.communityCheckedUnits,
  },
  { headerKey: "d_p_approved_short", cell: (record) => record.approvedUnits },
  { headerKey: "f_total_planned", cell: (record) => record.totalUnits },
  {
    headerKey: "sb_health",
    cell: (record, t) => t(HEALTH_LABEL_KEYS[record.overallHealth]),
  },
  { headerKey: "export_col_open_needs", cell: (record) => record.openNeeds },
  {
    headerKey: "export_col_prayer_shared",
    cell: (record) => record.sharedPrayerRequests.join(CSV_JOIN),
  },
  { headerKey: "d_last_update", cell: (record) => record.lastUpdated },
];

export function toCsvExport(data: ProjectsExport, t: TFunction): string {
  const preamble: (string | number)[][] = [
    [data.contains],
    [t("export_generated", { when: data.generatedAt })],
    [data.confidential],
    ...(data.withheldNote === null ? [] : [[data.withheldNote]]),
    [],
  ];
  const header = CSV_COLUMNS.map((column) => t(column.headerKey));
  const rows = data.records.map((record) =>
    CSV_COLUMNS.map((column) => column.cell(record, t)),
  );
  const lines = [...preamble, header, ...rows].map((cells) =>
    cells.map(csvCell).join(CSV_SEPARATOR),
  );
  return `${CSV_BOM}${lines.join("\r\n")}`;
}

export const EXPORT_MIME_TYPES: Record<ExportFormat, string> = {
  json: "application/json;charset=utf-8",
  csv: "text/csv;charset=utf-8",
};

export function serializeExport(
  data: ProjectsExport,
  format: ExportFormat,
  t: TFunction,
): string {
  return format === "json" ? toJsonExport(data) : toCsvExport(data, t);
}

export function downloadTextFile(
  fileName: string,
  content: string,
  mimeType: string,
): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
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
const isNumber = (value: unknown): boolean =>
  typeof value === "number" && Number.isFinite(value);
const isBoolean = (value: unknown): boolean => typeof value === "boolean";
const isArray = (value: unknown): boolean => Array.isArray(value);

const IMPORT_FIELD_CHECKS: ReadonlyArray<
  readonly [keyof Project, (value: unknown) => boolean]
> = [
  ["languageCode", isString],
  ["location", isString],
  ["team", isString],
  ["ywamBase", isString],
  ["status", isString],
  ["notes", isString],
  ["healthNotes", isString],
  ["lastUpdated", isString],
  ["objective", isArray],
  ["translationType", isArray],
  ["financialResources", isArray],
  ["needsItems", isArray],
  ["progressHistory", isArray],
  ["bookProgress", isArray],
  ["storyProgress", isArray],
  ["materials", isArray],
  ["phases", isArray],
  ["totalUnits", isNumber],
  ["translatedUnits", isNumber],
  ["communityCheckedUnits", isNumber],
  ["approvedUnits", isNumber],
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
