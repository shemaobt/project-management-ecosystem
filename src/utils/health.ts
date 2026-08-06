import { HEALTH_SCORES } from "../constants/project";
import type {
  HealthRating,
  OverallHealth,
  Project,
  ProjectPriority,
} from "../types/project";
import { getProjectStatus } from "./progress";
import { getStaleStatus } from "./recency";

function healthDimensions(project: Project): HealthRating[] {
  return [
    project.healthEmotional,
    project.healthRelational,
    project.healthSpiritual,
    project.healthPhysical,
  ].filter((value): value is HealthRating => Boolean(value));
}

export function getOverallHealth(project: Project): OverallHealth {
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
