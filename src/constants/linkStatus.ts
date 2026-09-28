import type { IntakeLinkStatus } from "../types/forms";

export const LINK_STATUS_LABEL_KEYS: Record<IntakeLinkStatus, string> = {
  pending: "intake_status_pending",
  used: "intake_status_used",
  expired: "intake_status_expired",
  revoked: "intake_status_revoked",
};

export const LINK_STATUS_TONES: Record<
  IntakeLinkStatus,
  "accent" | "green" | "neutral"
> = {
  pending: "accent",
  used: "green",
  expired: "neutral",
  revoked: "neutral",
};
