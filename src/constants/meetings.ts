import type {
  MeetingAttendee,
  MeetingCadence,
  MeetingDefinition,
  MeetingFeed,
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
  quarterly: "ritmo_quarterly",
  annual: "ritmo_annual",
};

export const MEETING_STATE_LABEL_KEYS: Record<MeetingState, string> = {
  done: "ritmo_st_done",
  pending: "ritmo_st_pending",
  overdue: "ritmo_st_overdue",
  new: "ritmo_st_new",
};

export const MEETING_FEED_LABEL_KEYS: Record<MeetingFeed, string> = {
  pulso: "ritmo_feed_pulso",
  prayer: "ritmo_feed_prayer",
  health: "ritmo_feed_health",
  trends: "ritmo_feed_trends",
  rollup: "ritmo_feed_rollup",
  year: "ritmo_feed_year",
  resources: "ritmo_feed_resources",
};

export const MEETING_ATTENDEE_LABEL_KEYS: Record<MeetingAttendee, string> = {
  coordinator: ROLE_DEFINITIONS.coordinator.labelKey,
  obtLab: ROLE_DEFINITIONS.obtLab.labelKey,
  resourceCircle: ROLE_DEFINITIONS.resourceCircle.labelKey,
  supervisor: "ritmo_role_supervisor",
  leadership: "ritmo_role_leadership",
  teams: "ritmo_role_teams",
  everyone: "ritmo_role_everyone",
  resourcesTable: "ritmo_role_resourcecircle",
};

export interface ListeningTier {
  key: string;
  levelKey: string;
  attendees: readonly MeetingAttendee[];
  whatKey: string;
}

export const LISTENING_FLOW: readonly ListeningTier[] = [
  {
    key: "field",
    levelKey: "ritmo_flow_field",
    attendees: ["teams"],
    whatKey: "ritmo_flow_field_what",
  },
  {
    key: "region",
    levelKey: "ritmo_flow_region",
    attendees: ["obtLab"],
    whatKey: "ritmo_flow_region_what",
  },
  {
    key: "regional-team",
    levelKey: "ritmo_flow_regional_team",
    attendees: ["coordinator", "resourceCircle"],
    whatKey: "ritmo_flow_regional_team_what",
  },
  {
    key: "articulation",
    levelKey: "ritmo_flow_articulation",
    attendees: ["supervisor"],
    whatKey: "ritmo_flow_articulation_what",
  },
  {
    key: "governance",
    levelKey: "ritmo_flow_governance",
    attendees: ["leadership"],
    whatKey: "ritmo_flow_governance_what",
  },
];

export const RITMO_MEETINGS: readonly MeetingDefinition[] = [
  {
    id: "monthly_regional",
    cadence: "monthly",
    scope: "region",
    icon: "pulse",
    roles: ["obtLab", "teams"],
    feeds: "pulso",
    readiness: "pulso",
    titleKey: "ritmo_m1_title",
    descriptionKey: "ritmo_m1_desc",
  },
  {
    id: "monthly_prayer",
    cadence: "monthly",
    scope: "region",
    icon: "prayer",
    roles: ["resourceCircle"],
    feeds: "prayer",
    titleKey: "ritmo_m6_title",
    descriptionKey: "ritmo_m6_desc",
  },
  {
    id: "obtlab_team",
    cadence: "quarterly",
    scope: "region",
    icon: "heart",
    roles: ["obtLab", "teams"],
    feeds: "health",
    readiness: "health",
    titleKey: "ritmo_m2_title",
    descriptionKey: "ritmo_m2_desc",
  },
  {
    id: "quarterly_regional",
    cadence: "quarterly",
    scope: "region",
    icon: "users",
    roles: ["supervisor", "obtLab", "coordinator"],
    feeds: "trends",
    titleKey: "ritmo_m3_title",
    descriptionKey: "ritmo_m3_desc",
  },
  {
    id: "annual_celebration",
    cadence: "annual",
    scope: "global",
    icon: "spark",
    roles: ["everyone"],
    feeds: "year",
    titleKey: "ritmo_m5_title",
    descriptionKey: "ritmo_m5_desc",
  },
];
