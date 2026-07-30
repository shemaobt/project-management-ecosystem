import type { PresetId, Project } from "../types/project";
import { getOverallHealth } from "./health";
import { getProjectStatus } from "./progress";
import { getStaleStatus, isRecentlyUpdated } from "./recency";

export function matchesPreset(
  project: Project,
  preset: PresetId,
  now: Date = new Date(),
): boolean {
  switch (preset) {
    case "recent":
      return isRecentlyUpdated(project, now);
    case "attention": {
      const hasUrgentNeed = project.needsItems.some(
        (need) => need.urgency === "high" && need.status !== "fulfilled",
      );
      return (
        getOverallHealth(project) === "critica" ||
        getStaleStatus(project, now) === "critico" ||
        hasUrgentNeed
      );
    }
    case "prayer":
      return project.needsItems.some((need) => Boolean(need.prayerShared));
    case "celebrate":
      return (
        getProjectStatus(project) === "concluido" ||
        project.needsItems.some((need) => Boolean(need.prayerAnswered))
      );
  }
}
