import type { Project, ProjectDerived } from "../types/project";
import { getOverallHealth, getPriority, healthScore } from "./health";
import { getProgress, getProjectStatus } from "./progress";
import {
  getDaysSinceUpdate,
  getLastProgressUpdate,
  getStaleStatus,
} from "./recency";
import { getRegion } from "./region";

/**
 * The nine derivations BE-05's `ShemaProjectDerived` carries, computed the same way the
 * fixture layer always has. Used to attach a `derived` block to fixture-sourced browse
 * results, so the Projetos screen's rendering code is one path regardless of source —
 * see `components/pages/projetos/derived.ts`.
 */
export function computeDerived(
  project: Project,
  now: Date = new Date(),
): ProjectDerived {
  return {
    status: getProjectStatus(project),
    health: getOverallHealth(project),
    stale: getStaleStatus(project, now),
    progress: getProgress(project),
    priority: getPriority(project, now),
    healthScore: healthScore(project),
    daysSinceUpdate: getDaysSinceUpdate(project, now),
    lastProgressUpdate: getLastProgressUpdate(project),
    region: getRegion(project),
  };
}
