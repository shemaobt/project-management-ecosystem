import type { PrayerVisibility, Project } from "../types/project";

export interface PrayerSeedEntry {
  text: string;
  visibility?: PrayerVisibility;
}

export interface PrayerSeed {
  assessmentDate: string;
  requests: Record<string, PrayerSeedEntry>;
}

export function applyPrayerSeed(projects: Project[], seed: PrayerSeed): Project[] {
  return projects.map((project) => {
    const request = seed.requests[project.id];
    if (project.prayerRequests || !request) return project;
    return {
      ...project,
      prayerRequests: request.text,
      prayerVisibility: request.visibility,
      healthAssessmentDate: project.healthAssessmentDate || seed.assessmentDate,
    };
  });
}
