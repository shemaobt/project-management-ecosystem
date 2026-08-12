import {
  HEALTH_DIMENSIONS,
  type AssessedProject,
  type HealthDimension,
} from "../constants/health";
import { HEALTH_SCORES } from "../constants/project";
import type {
  HealthAssessment,
  HealthRating,
  OverallHealth,
  Project,
  ProjectPriority,
} from "../types/project";
import { getProjectStatus } from "./progress";
import { getStaleStatus } from "./recency";

function healthDimensions(project: AssessedProject): HealthRating[] {
  return [
    project.healthEmotional,
    project.healthRelational,
    project.healthSpiritual,
    project.healthPhysical,
  ].filter((value): value is HealthRating => Boolean(value));
}

export function dimensionRating(
  project: AssessedProject,
  dimension: HealthDimension,
): HealthRating {
  return project[dimension.field] ?? "";
}

export function isAssessed(project: AssessedProject): boolean {
  return HEALTH_DIMENSIONS.some(
    (dimension) => dimensionRating(project, dimension) !== "",
  );
}

export function assessmentHistory(
  project: AssessedProject,
): HealthAssessment[] {
  return [...(project.healthHistory ?? [])].sort((a, b) =>
    a.date.localeCompare(b.date),
  );
}

export function currentAssessment(
  project: AssessedProject,
): HealthAssessment | null {
  const history = assessmentHistory(project);
  if (history.length > 0) return history[history.length - 1];
  if (!isAssessed(project)) return null;

  return {
    date: project.healthAssessmentDate ?? "",
    assessor: project.healthAssessor ?? "",
    emotional: project.healthEmotional ?? "",
    relational: project.healthRelational ?? "",
    spiritual: project.healthSpiritual ?? "",
    physical: project.healthPhysical ?? "",
    notes: project.healthNotes ?? "",
  };
}

export function recordAssessment(
  project: Project,
  next: HealthAssessment,
): Project {
  const stored = project.healthHistory ?? [];
  const previous = currentAssessment(project);
  const kept = stored.length === 0 && previous ? [previous] : stored;

  const history = [...kept, next].sort((a, b) => a.date.localeCompare(b.date));
  const newest = history[history.length - 1];

  return {
    ...project,
    healthHistory: history,
    healthEmotional: newest.emotional,
    healthRelational: newest.relational,
    healthSpiritual: newest.spiritual,
    healthPhysical: newest.physical,
    healthAssessmentDate: newest.date,
    healthAssessor: newest.assessor,
    healthNotes: newest.notes,
  };
}

export function getOverallHealth(project: AssessedProject): OverallHealth {
  const values = healthDimensions(project);
  if (values.length === 0) return "na";
  if (values.some((value) => value === "critica")) return "critica";
  if (values.some((value) => value === "atencao")) return "atencao";
  return "boa";
}

export function healthScore(project: Project): number {
  return (
    HEALTH_SCORES[project.healthEmotional] +
    HEALTH_SCORES[project.healthRelational] +
    HEALTH_SCORES[project.healthSpiritual] +
    HEALTH_SCORES[project.healthPhysical ?? ""]
  );
}

export function getPriority(project: Project, now: Date = new Date()): ProjectPriority {
  const health = getOverallHealth(project);
  const stale = getStaleStatus(project, now);
  const status = getProjectStatus(project);

  if (status === "cancelado") return "canceled";
  if (status === "pausado") return "paused";
  if (health === "critica" || stale === "critico") return "critical";
  if (health === "atencao" || stale === "atencao") return "warning";
  if (status === "concluido") return "completed";
  if (status === "planejado") return "planned";
  if (status === "desconhecido") return "unknown";
  return "default";
}
