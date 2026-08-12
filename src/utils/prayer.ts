import { DEFAULT_PRAYER_VISIBILITY } from "../constants/prayer";
import type { PrayerVisibility, Project } from "../types/project";

export function getPrayerVisibility(
  project: Pick<Project, "prayerVisibility">,
): PrayerVisibility {
  return project.prayerVisibility ?? DEFAULT_PRAYER_VISIBILITY;
}

export function reachesPrayerWall(
  project: Pick<Project, "prayerVisibility">,
): boolean {
  return getPrayerVisibility(project) === "rede";
}
