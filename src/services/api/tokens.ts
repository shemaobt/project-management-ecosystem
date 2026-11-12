import type { AuthTokens } from "../../types/session";

export type SessionEvent = "signedIn" | "signedOut" | "expired";

let tokens: AuthTokens | null = null;

const listeners = new Set<(event: SessionEvent) => void>();

function announce(event: SessionEvent): void {
  for (const listener of [...listeners]) listener(event);
}

export function onSessionEvent(
  listener: (event: SessionEvent) => void,
): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function setTokens(next: AuthTokens): void {
  tokens = next;
  announce("signedIn");
}

export function replaceAccessToken(accessToken: string): boolean {
  if (!tokens) return false;
  tokens = { ...tokens, accessToken };
  return true;
}

export function accessToken(): string | null {
  return tokens?.accessToken ?? null;
}

export function refreshToken(): string | null {
  return tokens?.refreshToken ?? null;
}

export function hasSession(): boolean {
  return tokens !== null;
}

export function forgetTokens(reason: "signedOut" | "expired"): void {
  const had = tokens !== null;
  tokens = null;
  if (had) announce(reason);
}

/**
 * The person's own Sair, announced even when there is nothing left to forget (OBT-704). After an
 * expiry the tokens are already gone, so `forgetTokens` stays silent, and the Sair of the
 * expired-session dialog left the drafts and the remembered account the header's Sair wipes. Not
 * `forgetTokens` announcing always: a refused sign-in also clears through it, with no session
 * yet, and a wrong password must not cost the drafts the expired dialog exists to keep.
 */
export function leaveSession(): void {
  tokens = null;
  announce("signedOut");
}
