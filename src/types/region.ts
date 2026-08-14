import type { Coordinates } from "./project";

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

export type GeoOutline = Coordinates[];

export type LocationDisplay =
  | { withheld: false; location: string }
  | { withheld: true; regionLabelKey: string };
