import { MEETING_ATTENDEE_LABEL_KEYS } from "../constants/meetings";
import { REGIONS } from "../constants/regions";
import { ROLES } from "../constants/roles";
import type {
  MeetingAttendee,
  MeetingCadence,
  MeetingDefinition,
  MeetingLogEntry,
  MeetingReadiness,
  MeetingReadinessCount,
  MeetingStatus,
} from "../types/meeting";
import type { Project } from "../types/project";
import type { Region, RegionKey } from "../types/region";
import {
  coversPeriod,
  nextDeadline,
  periodEnd,
  periodKey,
  previousPeriodKey,
  toCalendarDate,
  type CalendarDate,
} from "./cadence";
import { isAssessed } from "./health";
import { getRegion, resolveRegionRoles } from "./region";

const ORG_CHART_ROLES = new Set<MeetingAttendee>(ROLES.map((role) => role.key));

export type MeetingScopeKey = RegionKey | "global";

export interface RhythmScope {
  key: MeetingScopeKey;
  labelKey: string;
  count: number;
}

export type ScheduledMeeting = Pick<MeetingDefinition, "id" | "cadence">;

export function meetingEntries(
  log: readonly MeetingLogEntry[],
  meetingId: MeetingDefinition["id"],
  scopeKey: MeetingScopeKey,
): MeetingLogEntry[] {
  return log
    .filter(
      (entry) => entry.meetingId === meetingId && entry.scopeKey === scopeKey,
    )
    .sort((a, b) => b.date.localeCompare(a.date));
}

export function meetingStatus(
  log: readonly MeetingLogEntry[],
  meeting: ScheduledMeeting,
  scopeKey: MeetingScopeKey,
  now: Date = new Date(),
): MeetingStatus {
  const today = toCalendarDate(now);
  const entries = meetingEntries(log, meeting.id, scopeKey);
  const current = entries.find(
    (entry) => entry.period === periodKey(meeting.cadence, today),
  );
  if (current) return { state: "done", date: current.date };
  if (entries.length === 0) return { state: "new", date: null };

  const previous = previousPeriodKey(meeting.cadence, today);
  return {
    state: entries.some((entry) => entry.period === previous)
      ? "pending"
      : "overdue",
    date: entries[0].date,
  };
}

export function nextOccurrence(
  meeting: ScheduledMeeting,
  status: MeetingStatus,
  now: Date = new Date(),
): CalendarDate {
  const today = toCalendarDate(now);
  return status.state === "done"
    ? nextDeadline(meeting.cadence, today)
    : periodEnd(meeting.cadence, today);
}

export function hasReported(
  kind: MeetingReadiness,
  project: Project,
  cadence: MeetingCadence,
  today: CalendarDate,
): boolean {
  if (kind === "pulso") {
    return coversPeriod(cadence, project.lastUpdated, today);
  }
  return (
    isAssessed(project) &&
    coversPeriod(cadence, project.healthAssessmentDate, today)
  );
}

export function meetingReadiness(
  kind: MeetingReadiness,
  cadence: MeetingCadence,
  projects: readonly Project[],
  scopeKey: MeetingScopeKey,
  now: Date = new Date(),
): MeetingReadinessCount | null {
  const inScope =
    scopeKey === "global"
      ? projects
      : projects.filter((project) => getRegion(project) === scopeKey);
  if (inScope.length === 0) return null;

  const today = toCalendarDate(now);
  return {
    ready: inScope.filter((project) =>
      hasReported(kind, project, cadence, today),
    ).length,
    total: inScope.length,
  };
}

export function rhythmScopes(projects: readonly Project[]): RhythmScope[] {
  const counts = new Map<RegionKey, number>();
  for (const project of projects) {
    const region = getRegion(project);
    counts.set(region, (counts.get(region) ?? 0) + 1);
  }
  return REGIONS.filter((region) => (counts.get(region.key) ?? 0) > 0)
    .map((region) => ({
      key: region.key,
      labelKey: region.labelKey,
      count: counts.get(region.key) ?? 0,
    }))
    .sort((a, b) => b.count - a.count);
}

export interface MeetingParticipant {
  key: MeetingAttendee;
  labelKey: string;
  holder: string | null;
  fromOrgChart: boolean;
}

export function resolveMeetingParticipants(
  meeting: Pick<MeetingDefinition, "roles">,
  scopeKey: MeetingScopeKey,
  regions: readonly Region[],
): MeetingParticipant[] {
  const holders =
    scopeKey === "global" ? [] : resolveRegionRoles(scopeKey, regions);
  return meeting.roles.map((role) => ({
    key: role,
    labelKey: MEETING_ATTENDEE_LABEL_KEYS[role],
    holder: holders.find((entry) => entry.key === role)?.holder ?? null,
    fromOrgChart: ORG_CHART_ROLES.has(role),
  }));
}

export function scopesFor(
  meeting: Pick<MeetingDefinition, "scope">,
  projects: readonly Project[],
  globalLabelKey: string,
): RhythmScope[] {
  if (meeting.scope === "global") {
    return [{ key: "global", labelKey: globalLabelKey, count: projects.length }];
  }
  return rhythmScopes(projects);
}
