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
