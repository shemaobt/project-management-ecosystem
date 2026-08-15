import type { Coordinates } from "./project";
import type { RoleKey } from "./role";

export type RegionKey =
  | "south-america"
  | "north-america"
  | "africa"
  | "asia"
  | "oceania"
  | "europe"
  | "other";

export interface RegionDefinition {
  key: RegionKey;
  labelKey: string;
}

export interface RegionTeam {
  coordinator: string;
  obtLab: string;
  resourceCircle: string;
}

export interface Region {
  key: RegionKey;
  labelKey: string;
  team: RegionTeam;
}

export interface RoleChange {
  regionKey: RegionKey;
  role: RoleKey;
  from: string;
  to: string;
  changedBy: string;
  changedAt: string;
}

export type GeoOutline = Coordinates[];

export type LocationDisplay =
  | { withheld: false; location: string }
  | { withheld: true; regionLabelKey: string };
