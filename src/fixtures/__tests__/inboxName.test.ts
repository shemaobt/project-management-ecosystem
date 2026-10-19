import { afterEach, describe, expect, it, vi } from "vitest";
import type { MockRole } from "../../contexts/session";
import { formsAPI } from "..";
import { MOCK_SESSION_KEY } from "../session";

const stored = new Map<string, string>();
vi.stubGlobal("localStorage", {
  getItem: (key: string) => stored.get(key) ?? null,
  setItem: (key: string, value: string) => void stored.set(key, value),
  removeItem: (key: string) => void stored.delete(key),
});

afterEach(() => stored.clear());

const as = (role: MockRole) => stored.set(MOCK_SESSION_KEY, role);

/** The fixtures' sensitive project in Africa — the OBT Lab persona's region — with no public name. */
const EGYPT = "sa-di-of-high-egypt";

describe("o dublê da caixa do Pulso nomeia como o servidor (OBT-600)", () => {
  it("o OBT Lab lê a chave da região com o bit, e a coordenação lê o nome", async () => {
    as("admin");
    const link = await formsAPI.mintIntakeLink({ projectId: EGYPT });
    await formsAPI.submitIntake(link.token, {
      definitionVersion: 1,
      answers: { submittedBy: "Líder S", period: "2026-10" },
    });

    as("obtLab");
    const row = (await formsAPI.received()).find((entry) => entry.projectId === EGYPT)!;
    const detail = await formsAPI.readSubmission(row.id);
    for (const read of [row, detail]) {
      expect([read.languageName, read.languageNameWithheld]).toEqual(["africa", true]);
    }
    expect(JSON.stringify([row, detail])).not.toContain("Egypt");

    as("admin");
    const truth = (await formsAPI.received()).find((entry) => entry.projectId === EGYPT)!;
    expect([truth.languageName, truth.languageNameWithheld]).toEqual(["Sa'di of High Egypt", false]);
  });
});
