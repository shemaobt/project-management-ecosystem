import type { MeetingDefinition, MeetingState } from "../types/meeting";

export const MEETING_STATES: readonly MeetingState[] = [
  "done",
  "pending",
  "overdue",
  "new",
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
