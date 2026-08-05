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
