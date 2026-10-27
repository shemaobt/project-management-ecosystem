import type { SessionStatus } from "../../contexts/session";

export type SessionSurface = "app" | "signIn" | "loading" | "reauth";

export function sessionSurface(
  status: SessionStatus,
  real: boolean,
): SessionSurface {
  if (!real) return "app";
  if (status === "anonymous") return "signIn";
  if (status === "loading") return "loading";
  if (status === "expired") return "reauth";
  return "app";
}

export function keepsWorkMounted(surface: SessionSurface): boolean {
  return surface === "app" || surface === "reauth";
}

export const SIGNED_OUT_ADDRESS = "/";

/** A first visit keeps its address, so a shared link survives the sign-in (OBT-626, CLAUDE.md §8). */
export function forgetsAddress(
  from: SessionSurface,
  to: SessionSurface,
): boolean {
  return keepsWorkMounted(from) && to === "signIn";
}
