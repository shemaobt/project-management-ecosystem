import {
  NOTIFICATION_AUDIENCES,
  NOTIFICATION_LOG_LIMIT,
} from "../constants/notifications";
import { STALE_ATTENTION_DAYS } from "../constants/project";
import type { SessionRole } from "../contexts/AuthContext";
import type {
  AppNotification,
  NotificationPrefs,
} from "../types/notification";
import type { Project } from "../types/project";
import type { RegionKey } from "../types/region";
import { toLocalIsoDate } from "./format";
import { getOverallHealth } from "./health";
import { isOpenNeed } from "./needs";
import { buildPrayerRequests } from "./prayer";
import {
  getDaysSinceUpdate,
  getLastProgressUpdate,
  getStaleStatus,
  isNoNews,
} from "./recency";
import { getCountry, getLocationDisplay, getRegion } from "./region";

type SharedFacts = Pick<
  AppNotification,
  | "region"
  | "projectId"
  | "language"
  | "base"
  | "country"
  | "locationWithheld"
  | "mentor"
>;

function sharedFacts(project: Project): SharedFacts {
  const location = getLocationDisplay(project);
  return {
    region: getRegion(project),
    projectId: project.id,
    language: project.languageName || "—",
    base: project.team || project.ywamBase,
    country: location.withheld ? "" : getCountry(project),
    locationWithheld: location.withheld,
    mentor: project.mentor,
  };
}

function staleSince(lastUpdate: string): string {
  const crossed = new Date(`${lastUpdate}T00:00:00`);
  crossed.setDate(crossed.getDate() + STALE_ATTENTION_DAYS);
  return toLocalIsoDate(crossed);
}

export function buildNotifications(
  projects: readonly Project[],
  now: Date = new Date(),
): AppNotification[] {
  const entries: AppNotification[] = [];
  const byId = new Map(projects.map((project) => [project.id, project]));

  for (const project of projects) {
    const shared = sharedFacts(project);

    const arrival = project.progressHistory
      .filter((entry) => entry.fromField || entry.formType)
      .at(-1);
    if (arrival) {
      entries.push({
        kind: "field",
        id: `field:${project.id}:${arrival.date}`,
        urgent: false,
        audience: NOTIFICATION_AUDIENCES.field,
        date: arrival.date,
        fromField: arrival.fromField ?? "",
        ...shared,
      });
    }

    if (project.healthAssessmentDate) {
      const overall = getOverallHealth(project);
      entries.push({
        kind: "health",
        id: `health:${project.id}:${project.healthAssessmentDate}`,
        urgent: overall === "critica",
        audience: NOTIFICATION_AUDIENCES.health,
        date: project.healthAssessmentDate,
        overall,
        ...shared,
      });
    }

    project.needsItems.forEach((need, index) => {
      if (need.urgency !== "high" || !isOpenNeed(need)) return;
      entries.push({
        kind: "need",
        id: `need:${project.id}:${index}`,
        urgent: true,
        audience: NOTIFICATION_AUDIENCES.need,
        date: need.submittedAt ?? "",
        category: need.category,
        ...shared,
      });
    });

    const lastUpdate = getLastProgressUpdate(project);
    const daysSilent = getDaysSinceUpdate(project, now);
    if (
      lastUpdate !== null &&
      daysSilent !== null &&
      isNoNews(getStaleStatus(project, now))
    ) {
      entries.push({
        kind: "stale",
        id: `stale:${project.id}`,
        urgent: true,
        audience: NOTIFICATION_AUDIENCES.stale,
        date: staleSince(lastUpdate),
        daysSilent,
        ...shared,
      });
    }
  }

  for (const request of buildPrayerRequests(projects)) {
    if (request.answered) continue;
    const project = byId.get(request.projectId);
    entries.push({
      kind: "prayer",
      id: `prayer:${request.id}`,
      urgent: false,
      audience: NOTIFICATION_AUDIENCES.prayer,
      region: request.region,
      projectId: request.projectId,
      language: request.language,
      base: request.base,
      country: request.country,
      locationWithheld: request.locationWithheld,
      mentor: project?.mentor ?? "",
      date: request.date,
      text: request.text,
      ...(request.audioUrl ? { audioUrl: request.audioUrl } : {}),
    });
  }

  return entries.sort((a, b) => b.date.localeCompare(a.date));
}

export interface NotificationRoute {
  role: SessionRole;
  regions: readonly RegionKey[] | null;
}

export function routeNotifications(
  entries: readonly AppNotification[],
  route: NotificationRoute,
): AppNotification[] {
  return entries.filter(
    (entry) =>
      (route.role === "globalStrategist" ||
        entry.audience.includes(route.role)) &&
      (route.regions === null || route.regions.includes(entry.region)),
  );
}

function mentorMatches(mentor: string, userName: string | null): boolean {
  if (!userName) return false;
  return mentor.toLowerCase().includes(userName.trim().toLowerCase());
}

export function applyNotificationPrefs(
  entries: readonly AppNotification[],
  prefs: NotificationPrefs,
  userName: string | null,
): AppNotification[] {
  if (!prefs.enabled) return [];
  return entries.filter((entry) => {
    if (prefs.when === "urgent" && !entry.urgent) return false;
    if (prefs.scope === "mentored") return mentorMatches(entry.mentor, userName);
    if (prefs.scope === "custom") {
      return prefs.customProjectIds.includes(entry.projectId);
    }
    return true;
  });
}

export function visibleNotifications(
  projects: readonly Project[],
  route: NotificationRoute,
  prefs: NotificationPrefs,
  userName: string | null,
  now: Date = new Date(),
): AppNotification[] {
  return applyNotificationPrefs(
    routeNotifications(buildNotifications(projects, now), route),
    prefs,
    userName,
  ).slice(0, NOTIFICATION_LOG_LIMIT);
}

export function countUnread(
  entries: readonly AppNotification[],
  readIds: readonly string[],
): number {
  const read = new Set(readIds);
  return entries.filter((entry) => !read.has(entry.id)).length;
}

export type NotificationAge =
  | { unit: "today" }
  | { unit: "yesterday" }
  | { unit: "days"; days: number }
  | { unit: "date" };

export function notificationAge(
  date: string,
  now: Date = new Date(),
): NotificationAge {
  if (!date) return { unit: "date" };
  const days = Math.floor(
    (new Date(`${toLocalIsoDate(now)}T00:00:00`).getTime() -
      new Date(`${date}T00:00:00`).getTime()) /
      (1000 * 60 * 60 * 24),
  );
  if (days <= 0) return { unit: "today" };
  if (days === 1) return { unit: "yesterday" };
  if (days < 30) return { unit: "days", days };
  return { unit: "date" };
}
