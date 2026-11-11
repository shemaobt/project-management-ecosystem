import type {
  OverallHealth,
  Project,
  ProjectPriority,
  StaleStatus,
} from "../../../types/project";

/**
 * The Projetos screen's reading of a project's derivations: the server's `derived` block, and
 * nothing computed here. BE-05's browse stamps it on every card (`browse_projects.py`), and the
 * double does the same (`fixtures/projectBrowse.ts`); the wire still types it nullable, so a
 * card without it draws the empty state — no progress, priority `unknown`, health `na`, no
 * staleness, no last update — instead of a second computation in the browser (OBT-694, item 5).
 * Place and position are not here: they go through `utils/region.ts`, whose `getRegion` reads
 * the region key a reduced card carries in `location` (OBT-532).
 */
export function cardProgress(project: Project): number | null {
  return project.derived?.progress ?? null;
}

export function cardPriority(project: Project): ProjectPriority {
  return project.derived?.priority ?? "unknown";
}

export function cardStale(project: Project): StaleStatus | null {
  return project.derived?.stale ?? null;
}

export function cardHealth(project: Project): OverallHealth {
  return project.derived?.health ?? "na";
}

export function cardLastProgressUpdate(project: Project): string | null {
  return project.derived?.lastProgressUpdate ?? null;
}
