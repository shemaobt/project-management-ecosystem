import type { Project } from "../types/project";
import type { RegionKey, RegionTeam } from "../types/region";
import { getRegion } from "../utils/region";

export interface PrayerSeed {
  assessmentDate: string;
  requests: Record<string, string>;
}

export function applyRegionTeams(
  projects: Project[],
  teams: Record<RegionKey, RegionTeam>,
): Project[] {
  return projects.map((project) => {
    const team = teams[getRegion(project)];
    return {
      ...project,
      regionalCoordinator: team.coordinator,
      obtLabPerson: team.obtLab,
      resourceCirclePerson: team.resourceCircle,
    };
  });
}

export function applyPrayerSeed(projects: Project[], seed: PrayerSeed): Project[] {
  return projects.map((project) => {
    const request = seed.requests[project.id];
    if (project.prayerRequests || !request) return project;
    return {
      ...project,
      prayerRequests: request,
      healthAssessmentDate: project.healthAssessmentDate || seed.assessmentDate,
    };
  });
}
