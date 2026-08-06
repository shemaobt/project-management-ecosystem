import {
  DEADLINE_SOON_DAYS,
  RECENT_UPDATE_DAYS,
  STALE_ATTENTION_DAYS,
  STALE_CRITICAL_DAYS,
} from "../constants/project";
import type { DeadlineInfo, Project, StaleStatus } from "../types/project";
import { getProjectStatus } from "./progress";

const MS_PER_DAY = 1000 * 60 * 60 * 24;

function atLocalMidnight(date: string): Date {
  return new Date(`${date}T00:00:00`);
}

export function getLastProgressUpdate(project: Project): string | null {
  if (project.progressHistory.length > 0) {
    return project.progressHistory[project.progressHistory.length - 1].date;
  }
  return project.startDate || null;
}

export function getDaysSinceUpdate(
  project: Project,
  now: Date = new Date(),
): number | null {
  const date = getLastProgressUpdate(project);
  if (!date) return null;
  const last = atLocalMidnight(date);
  return Math.floor((now.getTime() - last.getTime()) / MS_PER_DAY);
}

export function getStaleStatus(
  project: Project,
  now: Date = new Date(),
): StaleStatus | null {
  const status = getProjectStatus(project);
  if (
    status === "concluido" ||
    status === "cancelado" ||
    status === "planejado" ||
    status === "desconhecido"
  ) {
    return null;
  }

  const days = getDaysSinceUpdate(project, now);
  if (days === null) return null;
  if (days >= STALE_CRITICAL_DAYS) return "critico";
  if (days >= STALE_ATTENTION_DAYS) return "atencao";
  return "em-dia";
}

export function getDeadlineInfo(
  deadline: string,
  now: Date = new Date(),
): DeadlineInfo {
  if (!deadline) return { cls: "", days: null };
  const days = Math.ceil(
    (atLocalMidnight(deadline).getTime() - now.getTime()) / MS_PER_DAY,
  );
  if (days < 0) return { cls: "overdue", days };
  if (days < DEADLINE_SOON_DAYS) return { cls: "soon", days };
  return { cls: "ok", days };
}

export function isRecentlyUpdated(
  project: Project,
  now: Date = new Date(),
): boolean {
  if (!project.lastUpdated) return false;
  const days =
    (now.getTime() - atLocalMidnight(project.lastUpdated).getTime()) /
    MS_PER_DAY;
  return days <= RECENT_UPDATE_DAYS;
}
