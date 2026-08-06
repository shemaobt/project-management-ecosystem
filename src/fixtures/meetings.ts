import { RITMO_MEETINGS } from "../constants/meetings";
import type { MeetingDefinition, MeetingLogEntry } from "../types/meeting";

const meetingLog: MeetingLogEntry[] = [];

export function loadMeetings(): MeetingDefinition[] {
  return RITMO_MEETINGS.map((meeting) => structuredClone(meeting));
}

export function loadMeetingLog(): MeetingLogEntry[] {
  return structuredClone(meetingLog);
}
