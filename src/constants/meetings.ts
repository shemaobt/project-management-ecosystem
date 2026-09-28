import type {
  Encounter,
  MeetingAttendee,
  MeetingCadence,
  MeetingDefinition,
  MeetingFeed,
  MeetingId,
  MeetingState,
} from "../types/meeting";
import { ROLE_DEFINITIONS } from "./roles";

export const MEETING_STATES: readonly MeetingState[] = [
  "done",
  "pending",
  "overdue",
  "new",
];

export const GLOBAL_SCOPE_LABEL_KEY = "ritmo_all_ecosystem";

export const MEETING_STATE_SYMBOLS: Record<MeetingState, string> = {
  done: "✓",
  pending: "○",
  overdue: "!",
  new: "–",
};

export const MEETING_CADENCE_LABEL_KEYS: Record<MeetingCadence, string> = {
  monthly: "ritmo_monthly",
  bimonthly: "ritmo_bimonthly",
  quarterly: "ritmo_quarterly",
  semiannual: "ritmo_semiannual",
  annual: "ritmo_annual",
};

export const MEETING_STATE_LABEL_KEYS: Record<MeetingState, string> = {
  done: "ritmo_st_done",
  pending: "ritmo_st_pending",
  overdue: "ritmo_st_overdue",
  new: "ritmo_st_new",
};

export const MEETING_FEED_LABEL_KEYS: Record<MeetingFeed, string> = {
  fieldCheck: "ritmo_feed_field_check",
  trends: "ritmo_feed_trends",
  memberCare: "ritmo_feed_member_care",
};

export const MEETING_ATTENDEE_LABEL_KEYS: Record<MeetingAttendee, string> = {
  coordinator: ROLE_DEFINITIONS.coordinator.labelKey,
  obtLab: ROLE_DEFINITIONS.obtLab.labelKey,
  resourceCircle: ROLE_DEFINITIONS.resourceCircle.labelKey,
  internationalProjects: "ritmo_role_international_projects",
  teams: "ritmo_role_teams",
  memberCare: "ritmo_role_member_care",
  projectLeader: "ritmo_role_project_leader",
};

export interface ListeningTier {
  key: string;
  levelKey: string;
  attendees: readonly MeetingAttendee[];
  whatKey: string;
}

/**
 * How listening flows, one tier per encounter of GATE-02 (OBT-388, 22/set/2026), in the order
 * the cadences widen: from the field every month to the whole year. The celebration has no
 * attendee list because GATE-02 gave it none — it is a report, not a meeting.
 */
export const LISTENING_FLOW: readonly ListeningTier[] = [
  {
    key: "pulso_mensal",
    levelKey: "ritmo_monthly",
    attendees: ["projectLeader"],
    whatKey: "ritmo_flow_pulso_what",
  },
  {
    key: "bimestral_pi_campo",
    levelKey: "ritmo_bimonthly",
    attendees: ["internationalProjects", "teams"],
    whatKey: "ritmo_flow_bimestral_what",
  },
  {
    key: "trimestral_pi_pontes",
    levelKey: "ritmo_quarterly",
    attendees: ["internationalProjects", "coordinator", "obtLab", "resourceCircle"],
    whatKey: "ritmo_flow_trimestral_what",
  },
  {
    key: "semestral_member_care",
    levelKey: "ritmo_semiannual",
    attendees: ["memberCare", "teams"],
    whatKey: "ritmo_flow_semestral_what",
  },
  {
    key: "celebracao_anual",
    levelKey: "ritmo_annual",
    attendees: [],
    whatKey: "ritmo_flow_celebracao_what",
  },
];

/**
 * The three meetings the log records — GATE-02's answer (OBT-388, Karina, 22/set/2026), with
 * the ids and cadences `shema-api` enforces (`MEETING_CADENCES`, BE-10). **The same set in the
 * seven regions**, so every meeting is held per region and none is `global`.
 *
 * The bimonthly's Health readiness and the quarterly's bridge people are **our reading**:
 * GATE-02 left both open, and `ourReading` is what makes the card say so.
 */
export const RITMO_MEETINGS: readonly MeetingDefinition[] = [
  {
    id: "bimestral_pi_campo",
    cadence: "bimonthly",
    scope: "region",
    icon: "heart",
    roles: ["internationalProjects", "teams"],
    feeds: "fieldCheck",
    readiness: "health",
    ourReading: true,
    titleKey: "ritmo_bimestral_title",
    descriptionKey: "ritmo_bimestral_desc",
  },
  {
    id: "trimestral_pi_pontes",
    cadence: "quarterly",
    scope: "region",
    icon: "users",
    roles: ["internationalProjects", "coordinator", "obtLab", "resourceCircle"],
    feeds: "trends",
    ourReading: true,
    titleKey: "ritmo_trimestral_title",
    descriptionKey: "ritmo_trimestral_desc",
  },
  {
    id: "semestral_member_care",
    cadence: "semiannual",
    scope: "region",
    icon: "care",
    roles: ["memberCare", "teams"],
    feeds: "memberCare",
    titleKey: "ritmo_semestral_title",
    descriptionKey: "ritmo_semestral_desc",
  },
];

export const MEETING_IDS: ReadonlySet<MeetingId> = new Set(
  RITMO_MEETINGS.map((meeting) => meeting.id),
);

/**
 * The listening cascade's index: the five encounters in cadence order, of which the log
 * records only the three meetings.
 */
export const RITMO_ENCOUNTERS: readonly Encounter[] = [
  {
    key: "pulso_mensal",
    kind: "form",
    cadence: "monthly",
    titleKey: "ritmo_pulso_title",
  },
  ...RITMO_MEETINGS.map(
    (meeting): Encounter => ({
      key: meeting.id,
      kind: "meeting",
      cadence: meeting.cadence,
      titleKey: meeting.titleKey,
    }),
  ),
  {
    key: "celebracao_anual",
    kind: "report",
    cadence: "annual",
    titleKey: "ritmo_celebracao_title",
  },
];
