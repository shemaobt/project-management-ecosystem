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
 * It keeps **no log of its own**: the fixture module never mutates (§4.1.1), and `rhythmStore`
 * is the one owner of what was written. What it reproduces is what the server decides and the
 * console must not — the period, derived from the day and the meeting's cadence — and the three
 * refusals the screen has to survive: a role outside the log's audience (the health audience
 * plus the platform admin, as `_health_audience.py` reads it — so the Resource Circle gets a 403
 * on all three routes), a region outside the caller's scope, and a day that is not a calendar day.
 */
const LOG_AUDIENCE: readonly SessionRole[] = [
  "globalStrategist",
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

function requireRegion(scopeKey: RegionKey): void {
  const scope = mockPersona().regionScope;
  if (scope !== null && !scope.includes(scopeKey)) {
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

export function loadMeetingLog(): MeetingLogEntry[] {
  requireAudience();
  return [];
}

export function logMeetingEntry(payload: MeetingLogPayload): MeetingLogEntry {
  requireAudience();
  requireRegion(payload.scopeKey);
  const cadence = cadenceOf(payload.meetingId);
  const held = parseIsoDate(payload.date);
  if (!held) {
    throw failure("invalid", `date: '${payload.date}' is not a calendar day`);
  }
  return {
    meetingId: payload.meetingId,
    scopeKey: payload.scopeKey,
    period: periodKey(cadence, held),
    date: payload.date,
    notes: payload.notes,
  };
}

export function undoMeetingEntry(scopeKey: RegionKey): void {
  requireAudience();
  requireRegion(scopeKey);
}
