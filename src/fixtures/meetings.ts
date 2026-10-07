import { RITMO_MEETINGS } from "../constants/meetings";
import { failure } from "../services/api/errors";
import type {
  MeetingId,
  MeetingLogEntry,
  MeetingLogPayload,
} from "../types/meeting";
import type { SessionRole } from "../types/session";
import type { RegionKey } from "../types/region";
import { parseIsoDate, periodKey } from "../utils/cadence";
import { mockPersona } from "./session";

/**
 * The double of BE-10's log (`shema-api` `_meeting_log.py`, `log_meeting.py`), for fixture mode.
 *
 * It holds the log **in memory, for the life of the page** — the intercessor double's shape — so
 * a meeting registered in fixture mode is still there when the Ritmo reads the log again on the
 * next visit, as it would be on the server. What it reproduces is what the server decides and the
 * console must not: the period, derived from the day and the meeting's cadence; one entry per
 * `(meeting, region, period)`, a second log replacing the first; the read scoped to the caller's
 * regions; and the refusals the screen has to survive — a role outside the log's audience (the
 * health audience plus the platform admin, as `_health_audience.py` reads it, so the Resource
 * Circle gets a 403 on all three routes), a region outside the caller's scope, a day that is not a
 * calendar day, and an undo of a period nobody logged.
 */
const LOG_AUDIENCE: readonly SessionRole[] = [
  "coordinator",
  "obtLab",
  "admin",
];

function requireAudience(): void {
  const persona = mockPersona();
  if (!persona.roles.some((role) => LOG_AUDIENCE.includes(role))) {
    throw failure(
      "forbidden",
      "The rhythm's log reaches the coordination, the OBT Lab and the global strategy; this account holds none of those roles in Shemá",
    );
  }
}

function reaches(scopeKey: RegionKey): boolean {
  const scope = mockPersona().regionScope;
  return scope === null || scope.includes(scopeKey);
}

function requireRegion(scopeKey: RegionKey): void {
  if (!reaches(scopeKey)) {
    throw failure("forbidden", "That region is outside your region scope");
  }
}

function cadenceOf(meetingId: MeetingId) {
  const meeting = RITMO_MEETINGS.find((entry) => entry.id === meetingId);
  if (!meeting) {
    throw failure("invalid", `meetingId: '${meetingId}' is not a meeting of the rhythm`);
  }
  return meeting.cadence;
}

const LOG = new Map<string, MeetingLogEntry>();

function slot(meetingId: MeetingId, scopeKey: RegionKey, period: string): string {
  return `${meetingId}/${scopeKey}/${period}`;
}

export function loadMeetingLog(): MeetingLogEntry[] {
  requireAudience();
  return [...LOG.values()]
    .filter((entry) => entry.scopeKey !== "global" && reaches(entry.scopeKey))
    .sort((a, b) => b.date.localeCompare(a.date))
    .map((entry) => structuredClone(entry));
}

export function logMeetingEntry(payload: MeetingLogPayload): MeetingLogEntry {
  requireAudience();
  requireRegion(payload.scopeKey);
  const cadence = cadenceOf(payload.meetingId);
  const held = parseIsoDate(payload.date);
  if (!held) {
    throw failure("invalid", `date: '${payload.date}' is not a calendar day`);
  }
  const entry: MeetingLogEntry = {
    meetingId: payload.meetingId,
    scopeKey: payload.scopeKey,
    period: periodKey(cadence, held),
    date: payload.date,
    notes: payload.notes,
  };
  LOG.set(slot(entry.meetingId, payload.scopeKey, entry.period), entry);
  return structuredClone(entry);
}

export function undoMeetingEntry(
  meetingId: MeetingId,
  scopeKey: RegionKey,
  period: string,
): void {
  requireAudience();
  requireRegion(scopeKey);
  if (!LOG.delete(slot(meetingId, scopeKey, period))) {
    throw failure("notFound", "No log for that meeting, region and period");
  }
}

/** Test-only: the double is an in-memory stand-in, and a suite needs a clean one per case. */
export function resetMeetingLog(): void {
  LOG.clear();
}
