import type { RegionKey } from "./region";
import type { RoleKey } from "./role";

export type MeetingId =
  | "monthly_regional"
  | "monthly_prayer"
  | "obtlab_team"
  | "quarterly_regional"
  | "annual_celebration";

export type MeetingCadence = "monthly" | "quarterly" | "annual";

export type MeetingIcon = "pulse" | "prayer" | "heart" | "users" | "spark";

export type MeetingScope = "region" | "global";

export type MeetingAttendee =
  | RoleKey
  | "supervisor"
  | "leadership"
  | "teams"
  | "everyone"
  | "resourcesTable";

export type MeetingFeed =
  | "pulso"
  | "prayer"
  | "health"
  | "trends"
  | "rollup"
  | "year"
  | "resources";

export type MeetingReadiness = "pulso" | "health";

export type MeetingState = "done" | "pending" | "overdue" | "new";

export interface MeetingDefinition {
  id: MeetingId;
  cadence: MeetingCadence;
  scope: MeetingScope;
  icon: MeetingIcon;
  roles: MeetingAttendee[];
  feeds: MeetingFeed;
  readiness?: MeetingReadiness;
  titleKey: string;
  descriptionKey: string;
}

export interface MeetingLogEntry {
  meetingId: MeetingId;
  scopeKey: RegionKey | "global";
  period: string;
  date: string;
  notes: string;
}

export interface MeetingStatus {
  state: MeetingState;
  date: string | null;
}

export interface MeetingReadinessCount {
  ready: number;
  total: number;
}
