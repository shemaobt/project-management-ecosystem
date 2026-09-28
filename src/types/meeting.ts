import type { RegionKey } from "./region";
import type { RoleKey } from "./role";

/**
 * The three meetings GATE-02 left (OBT-388, Karina, 22/set/2026), spelled exactly as
 * `shema-api`'s `ShemaMeetingId` spells them (BE-10, OBT-399): a log carries this id to the
 * server, and a spelling the server does not know is refused.
 */
export type MeetingId =
  | "bimestral_pi_campo"
  | "trimestral_pi_pontes"
  | "semestral_member_care";

export type MeetingCadence =
  | "monthly"
  | "bimonthly"
  | "quarterly"
  | "semiannual"
  | "annual";

export type MeetingIcon = "pulse" | "care" | "heart" | "users" | "spark";

export type MeetingScope = "region" | "global";

export type MeetingAttendee =
  | RoleKey
  | "internationalProjects"
  | "teams"
  | "memberCare"
  | "projectLeader";

export type MeetingFeed = "fieldCheck" | "trends" | "memberCare";

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
  /**
   * Who attends is **not defined yet**, so the card shows the roles it is held by and says the
   * people are still to be named. Only the quarterly carries it today: the bridge people do not
   * exist as information (Karina, 28/set/2026) — `BRIDGE_PEOPLE` in `constants/meetings.ts`.
   */
  participantsPending?: boolean;
  titleKey: string;
  descriptionKey: string;
}

/**
 * The five encounters GATE-02 named, of which only three are meetings. The Monthly Pulse is a
 * form whose record is the submission received, and the annual Celebration is a report — so
 * neither enters the meeting log, and they live in the listening cascade only.
 */
export type EncounterKind = "meeting" | "form" | "report";

export interface Encounter {
  key: MeetingId | "pulso_mensal" | "celebracao_anual";
  kind: EncounterKind;
  cadence: MeetingCadence;
  titleKey: string;
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
