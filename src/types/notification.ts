import type { NeedCategory, OverallHealth } from "./project";
import type { RegionKey } from "./region";
import type { RoleKey } from "./role";

export type NotificationKind = "field" | "health" | "need" | "stale" | "prayer";

export type NotificationChannel = "email" | "push" | "whatsapp";

export type NotificationWhen = "now" | "urgent" | "daily";

export type NotificationScope = "all" | "mentored" | "custom";

export interface NotificationPrefs {
  enabled: boolean;
  channels: Record<NotificationChannel, boolean>;
  when: NotificationWhen;
  scope: NotificationScope;
  emailAddr: string;
  phoneAddr: string;
  customProjectIds: string[];
}

export interface NotificationPrefsHandlers {
  setEnabled: (enabled: boolean) => void;
  toggleChannel: (channel: NotificationChannel) => void;
  setWhen: (when: NotificationWhen) => void;
  setScope: (scope: NotificationScope) => void;
  setEmailAddr: (emailAddr: string) => void;
  setPhoneAddr: (phoneAddr: string) => void;
  toggleCustomProject: (projectId: string) => void;
}

interface NotificationBase {
  id: string;
  urgent: boolean;
  audience: readonly RoleKey[];
  region: RegionKey;
  projectId: string;
  language: string;
  base: string;
  country: string;
  locationWithheld: boolean;
  mentor: string;
  date: string;
}

export interface FieldNotification extends NotificationBase {
  kind: "field";
  fromField: string;
}

export interface HealthNotification extends NotificationBase {
  kind: "health";
  overall: OverallHealth;
}

export interface NeedNotification extends NotificationBase {
  kind: "need";
  category: NeedCategory;
}

export interface StaleNotification extends NotificationBase {
  kind: "stale";
  daysSilent: number;
}

export interface PrayerNotification extends NotificationBase {
  kind: "prayer";
  text: string;
  audioUrl?: string;
}

export type AppNotification =
  | FieldNotification
  | HealthNotification
  | NeedNotification
  | StaleNotification
  | PrayerNotification;
