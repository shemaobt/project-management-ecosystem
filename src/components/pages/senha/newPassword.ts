import { MIN_PASSWORD } from "../convite/invitation";

/**
 * The bounds of `shema-api`'s `ResetPasswordRequest` (8–128), said on screen before the
 * trip: rejecting is the server's, anticipating is here. The floor is `/convite`'s own, so
 * the two places a password is chosen in the PME cannot disagree about it.
 */
export const PASSWORD_MIN = MIN_PASSWORD;
export const PASSWORD_MAX = 128;

export function outOfBounds(password: string): boolean {
  return (
    password.length > 0 && (password.length < PASSWORD_MIN || password.length > PASSWORD_MAX)
  );
}

export function withinBounds(password: string): boolean {
  return password.length >= PASSWORD_MIN && password.length <= PASSWORD_MAX;
}

/** An empty confirmation is not yet a mismatch — the person has not typed it. */
export function mismatched(password: string, confirmation: string): boolean {
  return confirmation.length > 0 && password !== confirmation;
}

export function ready(password: string, confirmation: string): boolean {
  return withinBounds(password) && confirmation === password;
}

/** Blank counts as absent: `?token=` and `?token=%20` open the refusal, never a form. */
export function readToken(raw: string | null): string | null {
  const token = raw?.trim() ?? "";
  return token ? token : null;
}

export type ResetRefusal = "refused" | "network";

/**
 * The server answers a 401 (`InvalidTokenError`) to a token that is invalid, expired or
 * already used — one sentence for the three, and the way out is a new link, never a retype.
 * Everything else is the network, and the form stays.
 */
export function resetRefusal(kind: string): ResetRefusal {
  return kind === "unauthorized" ? "refused" : "network";
}
