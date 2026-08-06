import type { Project } from "../types/project";

export interface PrayerSeed {
  assessmentDate: string;
  requests: Record<string, string>;
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
