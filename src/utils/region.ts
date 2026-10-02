import { REGION_CENTROIDS } from "../constants/geo";
import {
  COUNTRY_REGION,
  EMPTY_REGION_TEAM,
  FALLBACK_REGION,
  REGIONS,
} from "../constants/regions";
import { ROLES } from "../constants/roles";
import type { Coordinates, Project } from "../types/project";
import { hasPlottableCoords } from "./identity";
import type {
  LocationDisplay,
  PlaceDisplay,
  Region,
  RegionDefinition,
  RegionKey,
  RegionTeam,
} from "../types/region";
import type { RoleKey } from "../types/role";

export type Located = Pick<Project, "location">;

export function getCountry(project: Located): string {
  return project.location.split(",")[0].trim();
}

const REGION_KEYS: ReadonlySet<string> = new Set(REGIONS.map((region) => region.key));

function isRegionKey(value: string): value is RegionKey {
  return REGION_KEYS.has(value);
}

/**
 * A reduced payload (OBT-528) carries the region **key** where the location was, so the
 * key reads as its own region instead of an unknown country falling back to `other`.
 */
export function getRegion(project: Located): RegionKey {
  const country = getCountry(project);
  return (
    COUNTRY_REGION[country] ??
    (isRegionKey(country) ? country : FALLBACK_REGION)
  );
}

function regionOf(project: Project): RegionKey {
  return project.derived?.region ?? getRegion(project);
}

export function getRegionLabelKey(region: RegionKey): string {
  return (
    REGIONS.find((definition) => definition.key === region)?.labelKey ??
    "continent_other"
  );
}

/**
 * The language's name as the screen prints it (OBT-560). For a sensitive project read by
 * anybody but coordination the server sends the public name coordination registered — or,
 * while none is, the region key in its place, the convention `location` already follows.
 * A key is not a name, so that case reads as words: *Projeto sensível — África*.
 */
export function getLanguageNameDisplay(
  project: Pick<Project, "languageName" | "languageNameWithheld">,
  t: (key: string, options?: Record<string, string>) => string,
): string {
  if (project.languageNameWithheld && isRegionKey(project.languageName)) {
    return t("sensitive_project_named", {
      region: t(getRegionLabelKey(project.languageName)),
    });
  }
  return project.languageName;
}

export type MapPrecision = "exact" | "region";

export interface MapPlacement {
  coords: Coordinates;
  precision: MapPrecision;
}

/** Position is redacted by the flag for every reader — the map is the console's own output (§6.4). */
export function getMapPlacement(project: Project): MapPlacement {
  if (project.sensitiveCountry || !hasPlottableCoords(project.coords)) {
    const [lng, lat] = REGION_CENTROIDS[regionOf(project)];
    return { coords: [lng, lat], precision: "region" };
  }
  return { coords: project.coords, precision: "exact" };
}

function placeDisplay(project: Project, withheld: boolean): PlaceDisplay {
  if (withheld) {
    return {
      withheld: true,
      regionLabelKey: getRegionLabelKey(regionOf(project)),
      base: "",
    };
  }
  return {
    withheld: false,
    location: project.location,
    base: project.team || project.ywamBase,
  };
}

/**
 * The console's reading of a project's place and base: what the server built for this
 * reader (`readAs`). Only a payload read as coordination shows a sensitive place; one no
 * server read for anybody is withheld.
 */
export function getLocationDisplay(project: Project): PlaceDisplay {
  return placeDisplay(
    project,
    project.sensitiveCountry && project.readAs !== "coordination",
  );
}

/** What leaves the system — export, prayer wall, notifications, ETEN: withheld by the flag, whoever reads. */
export function getLeavingLocation(project: Project): PlaceDisplay {
  return placeDisplay(project, project.sensitiveCountry);
}

export function getCountryDisplay(project: Project): LocationDisplay {
  const display = getLeavingLocation(project);
  return display.withheld
    ? { withheld: true, regionLabelKey: display.regionLabelKey }
    : { withheld: false, location: getCountry(project) };
}

/**
 * The collection's withheld notice as the server's `withheld_note` spells it: how many
 * leave withheld, addressed to coordination only, and never 0. `addressed` defaults to the
 * rows' own answer — a list somebody read as coordination.
 */
export function withheldNotice(
  projects: readonly Project[],
  addressed: boolean = projects.some(
    (project) => project.readAs === "coordination",
  ),
): number | null {
  const count = projects.filter(
    (project) => getLeavingLocation(project).withheld,
  ).length;
  return addressed && count > 0 ? count : null;
}

/**
 * The one place that decides which region cards exist and their order — off a totals
 * map, whichever source computed it: `orderRegionPanel` derives the totals from raw
 * projects, `TeamByRegion`'s `orderByCounts` from the browse response's own baseline
 * counts. Two callers computing the same filter-and-sort separately is exactly the
 * one-owner-per-fact split §13 warns about — this is the single owner.
 */
export function orderRegionsByTotals(
  totals: Partial<Record<RegionKey, number>>,
): RegionDefinition[] {
  return REGIONS.filter(
    (region) => (totals[region.key] ?? 0) > 0 || region.key === "europe",
  ).sort((a, b) => (totals[b.key] ?? 0) - (totals[a.key] ?? 0));
}

export function orderRegionPanel(
  projects: readonly Project[],
): RegionDefinition[] {
  const totals: Partial<Record<RegionKey, number>> = {};
  for (const project of projects) {
    const region = getRegion(project);
    totals[region] = (totals[region] ?? 0) + 1;
  }
  return orderRegionsByTotals(totals);
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

export function getTeamOf(
  key: RegionKey,
  regions: readonly Region[],
): RegionTeam {
  return (
    regions.find((region) => region.key === key)?.team ?? {
      ...EMPTY_REGION_TEAM,
    }
  );
}

export function getRegionTeam(
  project: Located,
  regions: readonly Region[],
): RegionTeam {
  return getTeamOf(getRegion(project), regions);
}

export interface RoleHolder {
  key: RoleKey;
  labelKey: string;
  holder: string | null;
}

export function resolveRegionRoles(
  key: RegionKey,
  regions: readonly Region[],
): RoleHolder[] {
  const team = getTeamOf(key, regions);
  return ROLES.map((role) => ({
    key: role.key,
    labelKey: role.labelKey,
    holder: holderName(team, role.key),
  }));
}

export function resolveProjectRoles(
  project: Located,
  regions: readonly Region[],
): RoleHolder[] {
  return resolveRegionRoles(getRegion(project), regions);
}
