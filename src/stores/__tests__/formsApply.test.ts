import axios, { type InternalAxiosRequestConfig } from "axios";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReceivedSubmission } from "../../types/forms";

/**
 * The store's one write is about the **wire** — the row the server answers, the 409 and a dead
 * connection — so the source is flipped to `api` here, as `recordSave.test.ts` does; it is also
 * the only source in which `projectsStore.invalidate()` has a list to mark outdated.
 */
vi.mock("../../services/api/source", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../services/api/source")>();
  return { ...actual, resolveSource: () => "api" as const };
});

function createMemoryStorage() {
  const data = new Map<string, string>();
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
    removeItem: (key: string) => void data.delete(key),
    clear: () => data.clear(),
  };
}

const storage = createMemoryStorage();
vi.stubGlobal("localStorage", storage);
vi.stubGlobal("window", { localStorage: storage });

const { http } = await import("../../services/api/client");
const { useFormsStore } = await import("../formsStore");
const { useProjectsStore } = await import("../projectsStore");

interface Reply {
  status: number;
  data?: unknown;
  headers?: Record<string, string>;
}

const sent: InternalAxiosRequestConfig[] = [];
let reply: Reply = { status: 200 };
let inFlight: string[] | null = null;

const adapter = async (config: InternalAxiosRequestConfig) => {
  sent.push(config);
  inFlight = [...useFormsStore.getState().applying];
  const response = {
    data: reply.data ?? null,
    status: reply.status,
    statusText: "",
    headers: reply.headers ?? {},
    config,
  };
  const accepted = config.validateStatus
    ? config.validateStatus(reply.status)
    : reply.status >= 200 && reply.status < 300;
  if (accepted) return response;
  throw Object.assign(new Error(`status ${reply.status}`), {
    isAxiosError: true,
    code: "ERR_BAD_REQUEST",
    config,
    response,
  });
};
http.defaults.adapter = adapter;
axios.defaults.adapter = adapter;

const waiting = (id: string): ReceivedSubmission => ({
  id,
  kind: "pulso",
  projectId: "kadiweu",
  languageName: "Kadiwéu",
  languageNameWithheld: false,
  submittedBy: "Fresia",
  receivedAt: "2026-10-28",
  definitionVersion: 1,
  appliedAt: null,
});

const CONFLICT = {
  status: 409,
  data: {
    detail: "This record was saved by somebody else.",
    expectedVersion: 7,
    currentVersion: 9,
    changedFields: ["bookProgress"],
    changedBy: "Sofia",
    changedAt: "2026-10-30",
  },
  headers: { etag: '"9"' },
};

beforeEach(() => {
  sent.length = 0;
  inFlight = null;
  useFormsStore.setState({
    ...useFormsStore.getInitialState(),
    submissions: [waiting("s1"), waiting("s2")],
    hydrated: true,
  });
  useProjectsStore.setState({ ...useProjectsStore.getInitialState(), hydrated: true, outdated: false });
});

describe("a caixa aplica um Pulso pelo store, e aplicado é o fato do servidor (OBT-652)", () => {
  it("aplicado: a linha vira a resposta do servidor e a lista de projetos fica desatualizada", async () => {
    reply = { status: 200, data: { ...waiting("s1"), appliedAt: "2026-10-30" } };
    const result = await useFormsStore.getState().applySubmission("s1", '"7"');

    expect(result.ok).toBe(true);
    const [s1, s2] = useFormsStore.getState().submissions;
    expect(s1.appliedAt).toBe("2026-10-30");
    expect(s2.appliedAt).toBeNull();
    expect(useProjectsStore.getState().outdated).toBe(true);
  });

  it("enquanto o pedido está no ar, o Pulso consta como em voo, e deixa de constar na resposta", async () => {
    reply = { status: 200, data: { ...waiting("s1"), appliedAt: "2026-10-30" } };
    await useFormsStore.getState().applySubmission("s1", '"7"');

    expect(inFlight).toEqual(["s1"]);
    expect(useFormsStore.getState().applying).toEqual([]);
  });

  it("o 409 não toca a linha nem a lista, e não reaplica sozinho: um clique, uma escrita", async () => {
    reply = CONFLICT;
    const result = await useFormsStore.getState().applySubmission("s1", '"7"');

    expect(result).toMatchObject({ ok: false, reason: "conflict", version: '"9"' });
    expect(useFormsStore.getState().submissions[0].appliedAt).toBeNull();
    expect(useProjectsStore.getState().outdated).toBe(false);
    expect(sent.filter((config) => config.method === "post")).toHaveLength(1);
    expect(useFormsStore.getState().applying).toEqual([]);
  });

  it("a falha também deixa o Pulso esperando, sem marcar a carga da caixa", async () => {
    reply = { status: 403, data: { detail: "Role 'coordinator' is required for this action." } };
    const result = await useFormsStore.getState().applySubmission("s1", '"7"');

    expect(result).toMatchObject({ ok: false, reason: "failed" });
    const state = useFormsStore.getState();
    expect(state.submissions[0].appliedAt).toBeNull();
    expect([state.hydrated, state.loading]).toEqual([true, false]);
  });
});
