import type { PrayerRequest } from "../types/prayer";
import type { Project } from "../types/project";
import { reachesPrayerWall } from "../utils/prayer";
import { getCountry, getRegion } from "../utils/region";

export function buildPrayerRequests(projects: Project[]): PrayerRequest[] {
  const requests: PrayerRequest[] = [];

  projects.forEach((project) => {
    const region = getRegion(project);
    const country = getCountry(project);
    const base = project.team || project.ywamBase;
    const language = project.languageName || "—";
    const date = project.healthAssessmentDate || project.lastUpdated;

    if (project.prayerRequests.trim() && reachesPrayerWall(project)) {
      requests.push({
        id: `${project.id}-pr`,
        projectId: project.id,
        language,
        base,
        country,
        region,
        text: project.prayerRequests.trim(),
        source: "Formulário",
        answered: false,
        date,
      });
    }

    project.needsItems.forEach((need, index) => {
      if (!need.prayerShared || !need.description) return;
      requests.push({
        id: `${project.id}-need${index}`,
        projectId: project.id,
        language,
        base,
        country,
        region,
        text: need.description.trim(),
        source: "Necessidade",
        answered: Boolean(need.prayerAnswered),
        date,
      });
    });
  });

  return requests.sort((a, b) => b.date.localeCompare(a.date));
}
