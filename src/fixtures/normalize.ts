import type { Project } from "../types/project";

const EXPORT_DATE = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;

const pad = (value: string): string => value.padStart(2, "0");

export function toIsoDate(value: string): string {
  const match = EXPORT_DATE.exec(value);
  if (!match) return value;

  const [, day, month, year] = match;
  if (Number(month) < 1 || Number(month) > 12) return value;
  if (Number(day) < 1 || Number(day) > 31) return value;

  return `${year}-${pad(month)}-${pad(day)}`;
}

export function normalizeProjectDates(projects: Project[]): Project[] {
  return projects.map((project) => ({
    ...project,
    startDate: toIsoDate(project.startDate),
    deadline: toIsoDate(project.deadline),
    lastUpdated: toIsoDate(project.lastUpdated),
    healthAssessmentDate: toIsoDate(project.healthAssessmentDate),
    progressHistory: project.progressHistory.map((entry) => ({
      ...entry,
      date: toIsoDate(entry.date),
    })),
  }));
}
