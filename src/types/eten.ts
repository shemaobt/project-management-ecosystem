export interface EtenYearSnapshot {
  projectId: string;
  languageName: string;
  country: string;
  totalUnits: number;
  translatedUnitsAtPreviousYearEnd: number;
  translatedUnitsAtYearEnd: number;
}

export interface EtenYearReport {
  year: number;
  listedProjects: number;
  snapshots: EtenYearSnapshot[];
}
