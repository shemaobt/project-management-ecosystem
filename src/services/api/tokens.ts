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
