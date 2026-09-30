import type { Coordinates } from "../types/project";
import type { RegionKey } from "../types/region";

export const REGION_CENTROIDS: Readonly<Record<RegionKey, Coordinates>> = {
  "south-america": [-60, -10],
  "north-america": [-100, 45],
  africa: [20, 5],
  asia: [95, 35],
  oceania: [140, -20],
  europe: [15, 50],
  other: [-88, 15],
};

export const GLOBE_INITIAL_ROTATION = { lambda: -55, phi: -15 } as const;

export interface GlobeFocusPoint {
  key: string;
  label: string;
  nameKey: string;
  coords: Coordinates;
}

export const GLOBE_FOCUS_POINTS: readonly GlobeFocusPoint[] = [
  { key: "br", label: "BR", nameKey: "atlas_focus_br", coords: [-55, -15] },
  { key: "af", label: "AF", nameKey: "atlas_focus_af", coords: [-5, 10] },
  { key: "se", label: "SE", nameKey: "atlas_focus_se", coords: [120, 0] },
];
