import type { LocationDisplay } from "./region";

export type EtenCreditSource = "manual" | "calculated";

export type EtenReadingSource = "history" | "live";

export type EtenCompletionSource = "completedDate" | "snapshots";

export interface EtenCreditEntry {
  projectId: string;
  year: number;
  credits: number;
  source: EtenCreditSource;
  /** Who set the figure — BE-11's evidence, `""` where nobody was recorded. */
  recordedBy: string;
  recordedAt: string | null;
}

/**
 * The approved count at one cut, and the event it was read from. A `history` reading names the
 * progress entry and its day; a `live` one is the record as it stood when the report was
 * computed, so it has neither and the report's `asOf` dates it.
 */
export interface EtenReading {
  source: EtenReadingSource;
  approvedUnits: number;
  totalUnits: number | null;
  entryId: string | null;
  date: string | null;
}

export interface EtenManualEntry {
  credits: number;
  recordedBy: string;
  recordedAt: string | null;
}

export interface EtenYearSnapshot {
  projectId: string;
  languageName: string;
  country: LocationDisplay;
  scopeUnits: number;
  approvedAtStart: number;
  approvedAtEnd: number;
  advanced: number;
  concluded: boolean;
  completedInYear: boolean;
  undatedCompletion: boolean;
  hasData: boolean;
  credits: number | null;
  creditsSource: EtenCreditSource | null;
  startReading: EtenReading | null;
  endReading: EtenReading | null;
  completedDate: string | null;
  completionSource: EtenCompletionSource;
  /** The approved count still came from the Notion export; readings before the first save
   * that moved it are not counted. */
  approvedUnverified: boolean;
  manualEntry: EtenManualEntry | null;
}

export interface EtenYearReport {
  year: number;
  listedProjects: number;
  advancingProjects: number;
  totalCredits: number;
  hasData: boolean;
  snapshots: EtenYearSnapshot[];
  periodStart: string;
  periodEnd: string;
  asOf: string;
  /** The `shema_eten_reports` row that keeps this answer; `null` when nothing recorded it. */
  reportId: string | null;
  recordedAt: string | null;
}
