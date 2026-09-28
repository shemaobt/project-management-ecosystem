import type {
  OverallHealth,
  Project,
  ProjectPriority,
  StaleStatus,
} from "../../../types/project";
import { getPriority, getOverallHealth } from "../../../utils/health";
import { getProgress } from "../../../utils/progress";
import { getLastProgressUpdate, getStaleStatus } from "../../../utils/recency";

/**
 * The Projetos screen's own reading of a project's derivations — the server's `derived`
 * block when the card carries one, the plain util otherwise. Place and position are not
 * here: they go through `utils/region.ts`, whose `getRegion` reads the region key a
 * reduced card carries in `location` (OBT-532).
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
