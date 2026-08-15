import type {
  NotificationChannel,
  NotificationKind,
  NotificationPrefs,
  NotificationScope,
  NotificationWhen,
} from "../types/notification";
import type { RoleKey } from "../types/role";

export const NOTIF_DEFAULTS: NotificationPrefs = {
  enabled: true,
  channels: { email: true, push: true, whatsapp: false },
  when: "now",
  scope: "all",
  emailAddr: "karina@shema.org",
  phoneAddr: "+55 11 9•••• ‑1234",
  customProjectIds: [],
};

export const NOTIFICATION_AUDIENCES: Record<
  NotificationKind,
  readonly RoleKey[]
> = {
  field: ["coordinator", "obtLab"],
  health: ["coordinator", "obtLab"],
  need: ["coordinator", "obtLab"],
  stale: ["coordinator", "obtLab"],
  prayer: ["resourceCircle"],
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
