import type { NeedCategory, OverallHealth } from "./project";
import type { RegionKey } from "./region";
import type { RequestDecisionStage } from "./request";
import type { SessionRole } from "./session";

export type NotificationKind =
  | "field"
  | "health"
  | "need"
  | "stale"
  | "prayer"
  | "requestArrival"
  | "requestDecision";

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
  audience: readonly SessionRole[];
  region: RegionKey;
  projectId: string;
  language: string;
  /** OBT-560: `language` is not the language's own name — the public one or the region key.
   * `getLanguageNameDisplay` reads it. */
  languageNameWithheld?: boolean;
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

export type ProjectNotification =
  | FieldNotification
  | HealthNotification
  | NeedNotification
  | StaleNotification
  | PrayerNotification;

interface RequestNoticeBase {
  id: string;
  urgent: boolean;
  audience: readonly SessionRole[];
  projectId: string | null;
  date: string;
  requestName: string;
}

export interface RequestArrivalNotification extends RequestNoticeBase {
  kind: "requestArrival";
  requestStage: "triagem";
}

export interface RequestDecisionNotification extends RequestNoticeBase {
  kind: "requestDecision";
  requestStage: RequestDecisionStage;
}

export type RequestNotification =
  | RequestArrivalNotification
  | RequestDecisionNotification;

export type AppNotification = ProjectNotification | RequestNotification;

export type ProjectNotificationKind = ProjectNotification["kind"];

/** One currency's total among the urgent needs of one save — never a sum across currencies. */
export interface ServedNoticeTotal {
  amount: string;
  currency: string;
}

/**
 * Where an urgent need's project is, as the server let this reader read it: served only to a
 * reader who reaches the project, and as it leaves — a withheld project's `location` is its
 * region key, beside `locationWithheld`.
 */
export interface ServedNoticePlace {
  location: string;
  locationWithheld: boolean;
}

/**
 * What a project notice says, as facts the panel words in the reader's language (OBT-559).
 * `languageName` is `""` when the project is withheld and has no public name, and the sentence
 * says *a project*; `region` is the coarse key every recipient reads. The rest is each kind's
 * own: the day a health reading turned critical, the urgent needs of one save, who signed the
 * Pulse, how many days a quiet project has been quiet (`null` when it never reported).
 */
export interface ServedNoticeFacts {
  languageName: string;
  region: RegionKey | null;
  assessedOn: string | null;
  needCount: number | null;
  needCategories: string[];
  needTotals: ServedNoticeTotal[];
  submittedBy: string | null;
  daysSinceUpdate: number | null;
  place: ServedNoticePlace | null;
}

/**
 * A project notice as the server served it (INT-11 · OBT-416). Since OBT-559 the server answers
 * facts and no prose — the fields the fixture derivation reads still do not travel — and the
 * panel words them in its reader's language. `facts` is `null` for a notice written before
 * that, which says its kind and nothing it said. The two request kinds are not this shape: they
 * carry a name and a stage, and become `RequestNotification`.
 */
export interface ServedNotification {
  origin: "server";
  id: string;
  kind: ProjectNotificationKind;
  urgent: boolean;
  projectId: string | null;
  date: string;
  facts: ServedNoticeFacts | null;
}

export type PanelEntry = AppNotification | ServedNotification;
