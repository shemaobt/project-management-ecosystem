import { REGION_CENTROIDS } from "../../../constants/geo";
import type {
  OverallHealth,
  Project,
  ProjectPriority,
  StaleStatus,
} from "../../../types/project";
import type { LocationDisplay } from "../../../types/region";
import { hasPlottableCoords } from "../../../utils/identity";
import { getPriority, getOverallHealth } from "../../../utils/health";
import { getProgress } from "../../../utils/progress";
import { getLastProgressUpdate, getStaleStatus } from "../../../utils/recency";
import {
  getRegion,
  getRegionLabelKey,
  type MapPlacement,
} from "../../../utils/region";

/**
 * The Projetos screen's own reading of a project's derivations — never `utils/region.ts`'s
 * `getLocationDisplay` / `getMapPlacement` directly, and never the plain `getStaleStatus` /
 * `getPriority`.
 *
 * Both browse sources (`services/api/projectBrowse.ts`, `fixtures/projectBrowse.ts`) hand
 * this screen projects whose sensitive fields are *already* withheld — the server redacts
 * before it serialises, and the fixtures adapter mirrors that so the two sources agree.
 * `getRegion`/`getLocationDisplay` (utils/region.ts) recompute the region by parsing
 * `location` as a country name, which is exactly the field a withheld project no longer
 * carries truthfully — it holds the region's own key. Re-deriving from it here would read
 * "south-america" as an unknown country and silently fall back to the wrong region.
 * `project.derived.region`, computed from the *true* location before withholding, is the
 * one correct answer, so every function below prefers it and only falls back to the plain
 * util when `derived` is absent (a project rendered outside the browse flow — the render
 * tests that build `ProjectCardDiario`/`ProjectCardAtlas` straight off a fixture, with no
 * `derived` block at all).
 */

export function cardProgress(project: Project): number {
  return project.derived?.progress ?? getProgress(project);
}

export function cardPriority(project: Project): ProjectPriority {
  return project.derived?.priority ?? getPriority(project);
}

export function cardStale(project: Project): StaleStatus | null {
  return project.derived ? project.derived.stale : getStaleStatus(project);
}

export function cardHealth(project: Project): OverallHealth {
  return project.derived?.health ?? getOverallHealth(project);
}

export function cardLastProgressUpdate(project: Project): string | null {
  return project.derived
    ? project.derived.lastProgressUpdate
    : getLastProgressUpdate(project);
}

export function cardLocationDisplay(project: Project): LocationDisplay {
  if (!project.sensitiveCountry) {
    return { withheld: false, location: project.location };
  }
  const region = project.derived?.region ?? getRegion(project);
  return { withheld: true, regionLabelKey: getRegionLabelKey(region) };
}

export function cardMapPlacement(project: Project): MapPlacement {
  if (project.sensitiveCountry) {
    // A `derived` block only ever arrives already redacted — the server for an
    // API-sourced card, `fixtures/projectBrowse.ts` for a fixture-sourced one — so
    // `coords` is already the region centroid and trusting it is what keeps the two
    // sources agreeing. A project with no `derived` at all (a fixture read directly,
    // the render tests' own shape) still carries its true coordinates and needs the
    // same client-side reduction `getMapPlacement` always did.
    const region = project.derived?.region ?? getRegion(project);
    return {
      coords: project.derived ? project.coords : REGION_CENTROIDS[region],
      precision: "region",
    };
  }
  if (!hasPlottableCoords(project.coords)) {
    const region = project.derived?.region ?? getRegion(project);
    return { coords: REGION_CENTROIDS[region], precision: "region" };
  }
  return { coords: project.coords, precision: "exact" };
}
