import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReceivedSubmission } from "../../types/forms";

function createMemoryStorage() {
  const data = new Map<string, string>();
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => {
      data.set(key, value);
    },
    removeItem: (key: string) => {
      data.delete(key);
    },
    clear: () => data.clear(),
    raw: data,
  };
}

const storage = createMemoryStorage();
vi.stubGlobal("localStorage", storage);
vi.stubGlobal("window", { localStorage: storage });

const { useFormsStore, SUBMISSIONS_VERSION } = await import("../formsStore");
const { formsAPI } = await import("../../services/api");
const { meetingReadiness } = await import("../../utils/rhythm");
const { makeProject } = await import("../../utils/__tests__/factory");

const KEY = "shema-form-submissions-v1";
const NOW = new Date(2026, 9, 15);

const submission = (id: string, projectId: string, receivedAt: string): ReceivedSubmission => ({
  id,
  kind: "pulso",
  projectId,
  languageName: projectId,
  submittedBy: "Líder",
  receivedAt,
  definitionVersion: 1,
  appliedAt: null,
});

const projects = [
  makeProject({ id: "a", location: "africa" }),
  makeProject({ id: "lingala", location: "africa" }),
];

const reported = (submissions: ReceivedSubmission[]) =>
  meetingReadiness("pulso", "monthly", projects, "global", submissions, NOW)?.ready;

beforeEach(() => {
  storage.clear();
  useFormsStore.setState(useFormsStore.getInitialState(), true);
  vi.restoreAllMocks();
});

describe("as submissões de Pulso vêm do servidor, não da cópia do navegador (OBT-595)", () => {
  it("a cópia de antes do Pulso não responde pela contagem: a do servidor responde", async () => {
    const stale = [submission("s1", "a", "2026-10-02")];
    storage.setItem(
      KEY,
      JSON.stringify({ state: { submissions: stale, hydrated: true }, version: 1 }),
    );
    await useFormsStore.persist.rehydrate();

    expect(useFormsStore.getState().hydrated).toBe(false);
    expect(useFormsStore.getState().submissions).toEqual([]);

    const served = [...stale, submission("s2", "lingala", "2026-10-14")];
    const read = vi.spyOn(formsAPI, "received").mockResolvedValue(served);
    await useFormsStore.getState().hydrate();

    expect(read).toHaveBeenCalledTimes(1);
    expect(useFormsStore.getState().submissions).toEqual(served);
    expect(reported(stale)).toBe(1);
    expect(reported(useFormsStore.getState().submissions)).toBe(2);
  });

  it("nenhuma submissão recebida fica no navegador", async () => {
    vi.spyOn(formsAPI, "received").mockResolvedValue([submission("s1", "a", "2026-10-02")]);
    await useFormsStore.getState().hydrate();

    const kept = storage.getItem(KEY);
    expect(kept === null || !kept.includes("s1")).toBe(true);
    expect(JSON.parse(kept ?? '{"state":{}}').state.submissions ?? []).toEqual([]);
  });

  it("a cópia que uma versão anterior gravou é descartada ao carregar", async () => {
    storage.setItem(
      KEY,
      JSON.stringify({
        state: { submissions: [submission("old", "a", "2026-09-01")], hydrated: true },
        version: SUBMISSIONS_VERSION - 1,
      }),
    );
    await useFormsStore.persist.rehydrate();

    expect(useFormsStore.getState().submissions).toEqual([]);
    expect(storage.getItem(KEY)).not.toContain("old");
  });
});
