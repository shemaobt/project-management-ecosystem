import type { Project } from "../types/project";
import rawProjects from "./data/projects.json";
import prayerSeed from "./data/prayerSeed.json";
import { normalizeProjectDates } from "./normalize";
import { applyPrayerSeed, type PrayerSeed } from "./seeds";

export function loadRawProjects(): Project[] {
  return structuredClone(rawProjects as unknown as Project[]);
}

const projects: Project[] = applyPrayerSeed(
  normalizeProjectDates(rawProjects as unknown as Project[]),
  prayerSeed as PrayerSeed,
);

export function loadProjects(): Project[] {
  return structuredClone(projects);
}

export function loadProject(id: string): Project | null {
  const project = projects.find((candidate) => candidate.id === id);
  return project ? structuredClone(project) : null;
}

/**
 * `false` in a build that talks to the server (INT-12 · OBT-417): `vite.config.ts` swaps the
 * data files for empty stand-ins there, so the list the screens below read is empty because it
 * was withheld, not because there are no projects — and the screens must say which.
 */
export function shipsProjectData(): boolean {
  return projects.length > 0;
}
