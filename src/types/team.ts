export type TeamBodyKey =
  | "leadership"
  | "resourceCircle"
  | "projectsTeam"
  | "region";

export interface TeamBody {
  key: TeamBodyKey;
  labelKey: string;
  scopeKey: string;
  purposeKey: string;
}

export interface TeamDraft {
  coordinator: string;
  obtLab: string;
  resourceCircle: string;
}

export interface SaveOutcome {
  changed: number;
  filled: number;
  cleared: number;
}
