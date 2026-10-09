/**
 * When to ask for a photo's link again (OBT-582): a minute before the server's expiry, so the
 * picture on screen never points at an address that has just stopped working — and never
 * sooner than half a minute, so a link the server mints short cannot turn into a loop.
 */
export function linkRefreshDelayMs(expiresInMinutes: number): number {
  const lifetime = Math.max(0, expiresInMinutes) * 60_000;
  return Math.max(30_000, lifetime - 60_000);
}
