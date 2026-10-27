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

/**
 * Whether a change of surface ends the session the address belongs to (OBT-626). Projetos keeps
 * the search and the filters in its address and reads them back on mount, so a sign-out that
 * emptied the stores still left the last person's search in the bar for the next account to sign
 * in on the same tab. Only the work the session kept mounted giving way to the sign-in — *Sair*,
 * in the header or in the expired dialog — forgets it: a first visit keeps its address, which is
 * how a shared link survives the sign-in, and an expiry keeps it with the work.
 */
export function forgetsAddress(
  from: SessionSurface,
  to: SessionSurface,
): boolean {
  return keepsWorkMounted(from) && to === "signIn";
}
