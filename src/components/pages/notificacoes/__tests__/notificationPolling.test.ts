import { describe, expect, it, vi } from "vitest";

vi.stubGlobal("window", { localStorage: { getItem: () => null, setItem: () => undefined } });

/**
 * The bell's pace against the server (INT-11 · OBT-416): modest on a metered connection, and
 * fresh when someone comes back to look.
 */
const { NOTIFICATION_POLL_MS, NOTIFICATION_STALE_MS, readsOnReturn } = await import(
  "../useNotifications"
);

describe("o ritmo do sino", () => {
  it("consulta no máximo a cada cinco minutos", () => {
    expect(NOTIFICATION_POLL_MS).toBeGreaterThanOrEqual(5 * 60_000);
  });

  it("ao voltar à aba, lê de novo só se a última leitura envelheceu", () => {
    const now = 1_000_000;

    expect(readsOnReturn(null, now)).toBe(true);
    expect(readsOnReturn(now - 10_000, now)).toBe(false);
    expect(readsOnReturn(now - NOTIFICATION_STALE_MS - 1, now)).toBe(true);
  });
});
