import {
  NOTIFICATION_AUDIENCES,
  NOTIFICATION_LOG_LIMIT,
} from "../constants/notifications";
import { STALE_ATTENTION_DAYS } from "../constants/project";
import type { SessionRole } from "../contexts/AuthContext";
import type {
  AppNotification,
  NotificationPrefs,
  NotificationPrefsHandlers,
  PanelEntry,
  ProjectNotification,
  RequestNotification,
  ServedNotification,
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
import { getCountry, getLeavingLocation, getRegion } from "./region";

type SharedFacts = Pick<
  ProjectNotification,
  | "region"
  | "projectId"
  | "language"
  | "languageNameWithheld"
  | "base"
  | "country"
  | "locationWithheld"
  | "mentor"
>;

function sharedFacts(project: Project): SharedFacts {
  const location = getLeavingLocation(project);
  return {
    region: getRegion(project),
    projectId: project.id,
    language: project.languageName || "—",
    languageNameWithheld: project.languageNameWithheld,
    base: location.base,
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
): ProjectNotification[] {
  const entries: ProjectNotification[] = [];
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

    const needOccurrences = new Map<string, number>();
    for (const need of project.needsItems) {
      if (need.urgency !== "high" || !isOpenNeed(need)) continue;
      const identity = `need:${project.id}:${need.category}:${need.submittedAt ?? ""}`;
      const occurrence = needOccurrences.get(identity) ?? 0;
      needOccurrences.set(identity, occurrence + 1);
      entries.push({
        kind: "need",
        id: `${identity}:${occurrence}`,
        urgent: true,
        audience: NOTIFICATION_AUDIENCES.need,
        date: need.submittedAt ?? "",
        category: need.category,
        ...shared,
      });
    }

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
      languageNameWithheld: request.languageNameWithheld,
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

export function isRequestNotice(
  entry: PanelEntry,
): entry is RequestNotification {
  return entry.kind === "requestArrival" || entry.kind === "requestDecision";
}

export function isServedNotice(entry: PanelEntry): entry is ServedNotification {
  return "origin" in entry && entry.origin === "server";
}

export interface NotificationRoute {
  roles: readonly SessionRole[];
  regions: readonly RegionKey[] | null;
}

export function routeNotifications(
  entries: readonly AppNotification[],
  route: NotificationRoute,
): AppNotification[] {
  return entries.filter((entry) => {
    const addressed = entry.audience.some((key) => route.roles.includes(key));
    if (isRequestNotice(entry)) return addressed;
    return (
      addressed &&
      (route.regions === null || route.regions.includes(entry.region))
    );
  });
}

function mentorMatches(mentor: string, userName: string | null): boolean {
  if (!userName) return false;
  return mentor.toLowerCase().includes(userName.trim().toLowerCase());
}

/**
 * The prefs over a list, fixture-derived or served (INT-11). A served project notice carries
 * no mentor — the server wrote prose, not the record — so *só os que mentoro* asks the projects
 * the panel already lists for the mentor, by the notice's `projectId`.
 */
export function applyNotificationPrefs<Entry extends PanelEntry>(
  entries: readonly Entry[],
  prefs: NotificationPrefs,
  userName: string | null,
  projects: readonly Project[] = [],
): Entry[] {
  if (!prefs.enabled) return [];
  const mentored = new Set(
    projects
      .filter((project) => mentorMatches(project.mentor, userName))
      .map((project) => project.id),
  );
  return entries.filter((entry) => {
    if (prefs.when === "urgent" && !entry.urgent) return false;
    if (prefs.scope === "mentored") {
      if (isRequestNotice(entry)) return false;
      if (isServedNotice(entry)) {
        return entry.projectId !== null && mentored.has(entry.projectId);
      }
      return mentorMatches(entry.mentor, userName);
    }
    if (prefs.scope === "custom") {
      return (
        entry.projectId !== null &&
        prefs.customProjectIds.includes(entry.projectId)
      );
    }
    return true;
  });
}

export function routedNotifications(
  projects: readonly Project[],
  route: NotificationRoute,
  now: Date = new Date(),
): AppNotification[] {
  return routeNotifications(buildNotifications(projects, now), route);
}

export function visibleNotifications<Entry extends PanelEntry>(
  routed: readonly Entry[],
  prefs: NotificationPrefs,
  userName: string | null,
  projects: readonly Project[] = [],
): Entry[] {
  return applyNotificationPrefs(routed, prefs, userName, projects).slice(
    0,
    NOTIFICATION_LOG_LIMIT,
  );
}

/**
 * The seven prefs operations over any holder of a `NotificationPrefs` — the store in fixture
 * mode, the panel's unsaved draft against the server (INT-11). One owner for what each toggle
 * means, so the two homes cannot drift.
 */
export function prefsHandlers(
  update: (change: (prefs: NotificationPrefs) => NotificationPrefs) => void,
): NotificationPrefsHandlers {
  const patch = (fields: Partial<NotificationPrefs>) =>
    update((prefs) => ({ ...prefs, ...fields }));
  return {
    setEnabled: (enabled) => patch({ enabled }),
    toggleChannel: (channel) =>
      update((prefs) => ({
        ...prefs,
        channels: { ...prefs.channels, [channel]: !prefs.channels[channel] },
      })),
    setWhen: (when) => patch({ when }),
    setScope: (scope) => patch({ scope }),
    setEmailAddr: (emailAddr) => patch({ emailAddr }),
    setPhoneAddr: (phoneAddr) => patch({ phoneAddr }),
    toggleCustomProject: (projectId) =>
      update((prefs) => ({
        ...prefs,
        customProjectIds: prefs.customProjectIds.includes(projectId)
          ? prefs.customProjectIds.filter((id) => id !== projectId)
          : [...prefs.customProjectIds, projectId],
      })),
  };
}

export function countUnread(
  entries: readonly PanelEntry[],
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
