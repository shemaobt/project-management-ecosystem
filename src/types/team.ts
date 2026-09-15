import type { RegionKey } from "./region";

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

export interface SaveOutcome {
  changed: number;
  filled: number;
  cleared: number;
}

export interface TeamSaveResult {
  outcome: SaveOutcome;
  failedRegions: readonly RegionKey[];
}
