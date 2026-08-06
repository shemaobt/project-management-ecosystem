export type EtenCreditSource = "manual" | "calculated";

export interface EtenCreditEntry {
  projectId: string;
  year: number;
  credits: number;
  source: EtenCreditSource;
}

export interface EtenYearSnapshot {
  projectId: string;
  languageName: string;
  country: string;
  totalUnits: number;
  translatedUnitsAtPreviousYearEnd: number;
  translatedUnitsAtYearEnd: number;
  credits: number | null;
  creditsSource: EtenCreditSource | null;
}

export interface EtenYearReport {
  year: number;
  listedProjects: number;
  totalCredits: number;
  snapshots: EtenYearSnapshot[];
}
