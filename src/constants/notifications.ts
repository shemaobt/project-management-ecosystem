import type {
  NotificationChannel,
  NotificationKind,
  NotificationPrefs,
  NotificationScope,
  NotificationWhen,
  ServedNoticeKind,
} from "../types/notification";
import type { SessionRole } from "../types/session";

export const NOTIF_DEFAULTS: NotificationPrefs = {
  enabled: true,
  channels: { email: true, push: true, whatsapp: false },
  when: "now",
  scope: "all",
  emailAddr: "",
  phoneAddr: "",
  customProjectIds: [],
};

export const NOTIFICATION_AUDIENCES: Record<
  NotificationKind,
  readonly SessionRole[]
> = {
  field: ["coordinator", "obtLab"],
  health: ["coordinator", "obtLab"],
  need: ["coordinator", "obtLab"],
  stale: ["coordinator", "obtLab"],
  prayer: ["resourceCircle"],
  requestArrival: ["admin", "gestor"],
  requestDecision: ["equipe", "admin", "gestor", "mesa"],
};

export interface NotificationChannelOption {
  key: NotificationChannel;
  glyph: string;
  labelKey: string;
  subKey?: string;
  addr?: "emailAddr" | "phoneAddr";
}

export const NOTIFICATION_CHANNEL_OPTIONS: readonly NotificationChannelOption[] =
  [
    { key: "email", glyph: "✉", labelKey: "notif_channel_email", addr: "emailAddr" },
    {
      key: "push",
      glyph: "📱",
      labelKey: "notif_channel_push",
      subKey: "notif_channel_push_sub",
    },
    {
      key: "whatsapp",
      glyph: "💬",
      labelKey: "notif_channel_whatsapp",
      addr: "phoneAddr",
    },
  ];

export interface NotificationOption<Value extends string> {
  value: Value;
  labelKey: string;
  subKey: string;
}

export const NOTIFICATION_WHEN_OPTIONS: readonly NotificationOption<NotificationWhen>[] =
  [
    { value: "now", labelKey: "notif_when_now", subKey: "notif_when_now_sub" },
    {
      value: "urgent",
      labelKey: "notif_when_urgent",
      subKey: "notif_when_urgent_sub",
    },
    {
      value: "daily",
      labelKey: "notif_when_daily",
      subKey: "notif_when_daily_sub",
    },
  ];

export const NOTIFICATION_SCOPE_OPTIONS: readonly NotificationOption<NotificationScope>[] =
  [
    { value: "all", labelKey: "notif_scope_all", subKey: "notif_scope_all_sub" },
    {
      value: "mentored",
      labelKey: "notif_scope_mentored",
      subKey: "notif_scope_mentored_sub",
    },
    {
      value: "custom",
      labelKey: "notif_scope_custom",
      subKey: "notif_scope_custom_sub",
    },
  ];

export function isNotificationWhen(value: string): value is NotificationWhen {
  return NOTIFICATION_WHEN_OPTIONS.some((option) => option.value === value);
}

export function isNotificationScope(value: string): value is NotificationScope {
  return NOTIFICATION_SCOPE_OPTIONS.some((option) => option.value === value);
}

export const NOTIFICATION_LOG_LIMIT = 30;

/** The title a served project notice takes — its kind, in the reader's language (INT-11). */
export const SERVED_NOTICE_TITLE_KEYS: Record<ServedNoticeKind, string> = {
  field: "notif_kind_field",
  health: "notif_kind_health",
  need: "notif_kind_need",
  stale: "notif_kind_stale",
  prayer: "notif_kind_prayer",
  prayerReview: "notif_kind_prayer_review",
};

/**
 * The line a served project notice written before OBT-559 takes: its kind, and nothing it said.
 * The server answers such a row with no facts — its prose was written once, for whoever read it
 * then, and an urgent need's named the place.
 */
export const OLD_NOTICE_SUMMARY_KEYS: Record<ServedNoticeKind, string> = {
  field: "notif_served_old_field",
  health: "notif_served_old_health",
  need: "notif_served_old_need",
  stale: "notif_served_old_stale",
  prayer: "notif_served_old_prayer",
  prayerReview: "notif_served_old_prayer_review",
};
