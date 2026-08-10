import { REGION_CENTROIDS } from "../constants/geo";
import {
  COUNTRY_REGION,
  EMPTY_REGION_TEAM,
  FALLBACK_REGION,
  REGIONS,
} from "../constants/regions";
import type { Coordinates, Project } from "../types/project";
import type {
  Region,
  RegionDefinition,
  RegionKey,
  RegionTeam,
} from "../types/region";
import type { RoleKey } from "../types/role";

export function getCountry(project: Project): string {
  return project.location.split(",")[0].trim();
}

export function getRegion(project: Project): RegionKey {
  return COUNTRY_REGION[getCountry(project)] ?? FALLBACK_REGION;
}

export function getRegionLabelKey(region: RegionKey): string {
  return (
    REGIONS.find((definition) => definition.key === region)?.labelKey ??
    "continent_other"
  );
}

export type MapPrecision = "exact" | "region";

export interface MapPlacement {
  coords: Coordinates;
  precision: MapPrecision;
}

export function getMapPlacement(project: Project): MapPlacement {
  if (project.sensitiveCountry || !project.coords) {
    const [lng, lat] = REGION_CENTROIDS[getRegion(project)];
    return { coords: [lng, lat], precision: "region" };
  }
  return { coords: project.coords, precision: "exact" };
}

export type LocationDisplay =
  | { withheld: false; location: string }
  | { withheld: true; regionLabelKey: string };

export function getLocationDisplay(project: Project): LocationDisplay {
  if (project.sensitiveCountry) {
    return {
      withheld: true,
      regionLabelKey: getRegionLabelKey(getRegion(project)),
    };
  }
  return { withheld: false, location: project.location };
}

export function orderRegionPanel(
  projects: readonly Project[],
): RegionDefinition[] {
  const totals: Partial<Record<RegionKey, number>> = {};
  for (const project of projects) {
    const region = getRegion(project);
    totals[region] = (totals[region] ?? 0) + 1;
  }
  return REGIONS.filter(
    (region) => (totals[region.key] ?? 0) > 0 || region.key === "europe",
  ).sort((a, b) => (totals[b.key] ?? 0) - (totals[a.key] ?? 0));
}

export interface RegionPanelCard {
  key: RegionKey;
  labelKey: string;
  team: RegionTeam;
}

export function buildRegionPanel(
  projects: readonly Project[],
  regions: readonly Region[],
  canSeeRegion: (key: RegionKey) => boolean,
): RegionPanelCard[] {
  return orderRegionPanel(projects)
    .filter((region) => canSeeRegion(region.key))
    .map(({ key, labelKey }) => ({
      key,
      labelKey,
      team: regions.find((region) => region.key === key)?.team ?? {
        ...EMPTY_REGION_TEAM,
      },
    }));
}

export function holderName(team: RegionTeam, role: RoleKey): string | null {
  return team[role] || null;
}
