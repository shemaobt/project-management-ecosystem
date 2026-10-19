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

describe("as preferências do sino (OBT-604)", () => {
  it("só pede as preferências quem tem papel no app Shemá", async () => {
    const { readsSavedPrefs } = await import("../useNotifications");

    expect(readsSavedPrefs(["gestor"])).toBe(false);
    expect(readsSavedPrefs(["mesa", "gestor"])).toBe(false);
    expect(readsSavedPrefs(["admin", "gestor"])).toBe(true);
    expect(readsSavedPrefs(["coordinator"])).toBe(true);
    expect(readsSavedPrefs(["gestor", "obtLab"])).toBe(true);
  });
});

describe("a leitura das preferências (OBT-604)", () => {
  it("a chamada ao servidor só sai atrás da pergunta por papel", async () => {
    const source = (await import("../useNotifications?raw")).default;
    const effect = source.slice(source.indexOf("if (!mayReadPrefs) return;"));

    expect(source).toContain("const mayReadPrefs = readsSavedPrefs(user.roles);");
    expect(effect.indexOf("api.prefs()")).toBeGreaterThan(0);
    expect(source.match(/api\.prefs\(\)/g)).toHaveLength(1);
  });
});
