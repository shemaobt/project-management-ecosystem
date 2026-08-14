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
}

export interface EtenYearReport {
  year: number;
  listedProjects: number;
  advancingProjects: number;
  totalCredits: number;
  hasData: boolean;
  snapshots: EtenYearSnapshot[];
}
