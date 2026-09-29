import axios, { type InternalAxiosRequestConfig } from "axios";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { MeetingLogEntry } from "../../types/meeting";

/**
 * The log is `shema-api`'s since INT-07 (OBT-412), so this suite is about the **wire**: what the
 * store sends, what it keeps of the answer, and what it does with a refusal. The source is
 * flipped to the API here; the fixture double's own reproduction of the server lives in
 * `rhythmFixture.test.ts`.
 */
vi.mock("../../services/api/source", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("../../services/api/source")>();
  return { ...actual, resolveSource: () => "api" as const };
});

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
    has: (key: string) => data.has(key),
  };
}

const storage = createMemoryStorage();
vi.stubGlobal("localStorage", storage);
vi.stubGlobal("window", { localStorage: storage });

storage.setItem(
  "shema-rhythm-v1",
  JSON.stringify({
    state: {
      log: [
        {
          meetingId: "bimestral_pi_campo",
          scopeKey: "oceania",
          period: "2026-B5",
          date: "2026-09-10",
          notes: "a leitura pastoral de uma equipe",
        },
      ],
      drafts: {
        bimestral_pi_campo__oceania: { date: "2026-09-10", notes: "fica" },
        obtlab_team__oceania: { date: "2026-09-10", notes: "sai" },
      },
      hydrated: true,
    },
    version: 2,
  }),
);

const { http } = await import("../../services/api/client");
const {
  DRAFTS_KEY,
  LEGACY_RHYTHM_KEY,
  draftKey,
  legacyDrafts,
  retireLegacyRhythm,
  useRhythmStore,
} = await import("../rhythmStore");

const draftsOnLoad = useRhythmStore.getState().drafts;

interface Reply {
  status: number;
  data?: unknown;
}

const sent: InternalAxiosRequestConfig[] = [];
let queue: Reply[] = [];

const adapter = async (config: InternalAxiosRequestConfig) => {
  sent.push(config);
  const reply = queue.shift() ?? { status: 500 };
  const response = {
    data: reply.data ?? null,
    status: reply.status,
    statusText: "",
    headers: {},
    config,
  };
  if (reply.status >= 200 && reply.status < 300) return response;
  throw { isAxiosError: true, code: "ERR_BAD_REQUEST", config, response };
};

http.defaults.adapter = adapter;
axios.defaults.adapter = adapter;

const OCEANIA = "oceania" as const;
const key = draftKey("bimestral_pi_campo", OCEANIA);

const entry = (over: Partial<MeetingLogEntry> = {}): MeetingLogEntry => ({
  meetingId: "bimestral_pi_campo",
  scopeKey: OCEANIA,
  period: "2026-B3",
  date: "2026-05-04",
  notes: "",
  ...over,
});

const held = () => useRhythmStore.getState().log;

beforeEach(() => {
  sent.length = 0;
  queue = [];
  useRhythmStore.setState({
    log: [],
    drafts: {},
    forbidden: false,
    hydrated: false,
    loading: false,
    error: null,
  });
});

describe("o armazenamento antigo sai de cena", () => {
  it("shema-rhythm-v1 não existe mais depois que o store carrega", () => {
    expect(storage.has(LEGACY_RHYTHM_KEY)).toBe(false);
  });

  it("só as notas digitadas de reuniões que existem passam para a chave nova — o log não", () => {
    const moved = JSON.parse(storage.getItem(DRAFTS_KEY) ?? "null");

    expect(moved.state).toEqual({
      drafts: { bimestral_pi_campo__oceania: { date: "2026-09-10", notes: "fica" } },
    });
    expect(JSON.stringify(moved)).not.toContain("leitura pastoral");
    expect(draftsOnLoad).toEqual(moved.state.drafts);
  });

  it("uma nota já guardada na chave nova vence a cópia antiga", () => {
    const local = createMemoryStorage();
    local.setItem(
      LEGACY_RHYTHM_KEY,
      JSON.stringify({ state: { drafts: { [key]: { date: "2026-01-01", notes: "velha" } } } }),
    );
    local.setItem(
      DRAFTS_KEY,
      JSON.stringify({ state: { drafts: { [key]: { date: "2026-02-02", notes: "nova" } } } }),
    );

    retireLegacyRhythm(local);

    expect(JSON.parse(local.getItem(DRAFTS_KEY) ?? "null").state.drafts[key].notes).toBe(
      "nova",
    );
    expect(local.has(LEGACY_RHYTHM_KEY)).toBe(false);
  });

  it("um arquivo antigo ilegível não carrega nada, e sai do mesmo jeito", () => {
    const local = createMemoryStorage();
    local.setItem(LEGACY_RHYTHM_KEY, "{não é json");

    retireLegacyRhythm(local);

    expect(local.has(LEGACY_RHYTHM_KEY)).toBe(false);
    expect(local.has(DRAFTS_KEY)).toBe(false);
    expect(legacyDrafts({ state: { drafts: { [key]: "texto solto" } } })).toEqual({});
  });

  it("o que o store guarda neste navegador são os rascunhos, nunca o log", () => {
    useRhythmStore.setState({
      log: [entry()],
      drafts: { [key]: { date: "2026-05-04", notes: "rascunho" } },
    });
    const partialize = useRhythmStore.persist.getOptions().partialize;

    expect(partialize?.(useRhythmStore.getState())).toEqual({
      drafts: { [key]: { date: "2026-05-04", notes: "rascunho" } },
    });
  });
});

describe("o log vem do servidor", () => {
  it("a leitura é GET /shema/meetings/log e o store fica com o que ela devolveu", async () => {
    queue = [{ status: 200, data: [entry()] }];

    await useRhythmStore.getState().reload();

    expect(sent.map((config) => [config.method, config.url])).toEqual([
      ["get", "/shema/meetings/log"],
    ]);
    expect(held()).toEqual([entry()]);
    expect(useRhythmStore.getState().hydrated).toBe(true);
  });

  it("cada visita lê de novo — o log é escrito por outras pessoas", async () => {
    queue = [
      { status: 200, data: [] },
      { status: 200, data: [entry()] },
    ];

    await useRhythmStore.getState().reload();
    await useRhythmStore.getState().reload();

    expect(sent).toHaveLength(2);
    expect(held()).toEqual([entry()]);
  });

  it("um 403 é o papel sem acesso ao log, não uma falha: a tela diz de quem ele é", async () => {
    queue = [{ status: 403, data: { detail: "outside the audience" } }];

    await useRhythmStore.getState().reload();

    const state = useRhythmStore.getState();
    expect(state.forbidden).toBe(true);
    expect(state.error).toBeNull();
    expect(state.log).toEqual([]);
  });

  it("uma leitura que falha não vira um log vazio lido", async () => {
    queue = [{ status: 500 }];

    await useRhythmStore.getState().reload();

    const state = useRhythmStore.getState();
    expect(state.hydrated).toBe(false);
    expect(state.forbidden).toBe(false);
    expect(state.error?.kind).toBe("server");
  });
});

describe("registrar grava no servidor", () => {
  it("o corpo leva reunião, região, dia e nota — e nenhum período", async () => {
    queue = [{ status: 201, data: entry({ notes: "combinado" }) }];

    await useRhythmStore
      .getState()
      .logMeeting("bimestral_pi_campo", OCEANIA, { date: "2026-05-04", notes: "combinado" });

    expect(sent[0].method).toBe("post");
    expect(sent[0].url).toBe("/shema/meetings/log");
    expect(JSON.parse(String(sent[0].data))).toEqual({
      meetingId: "bimestral_pi_campo",
      scopeKey: OCEANIA,
      date: "2026-05-04",
      notes: "combinado",
    });
  });

  it("o período é o que o servidor devolveu, não um que o cliente recalculou", async () => {
    queue = [{ status: 201, data: entry({ period: "2026-B2", date: "2026-05-04" }) }];

    const outcome = await useRhythmStore
      .getState()
      .logMeeting("bimestral_pi_campo", OCEANIA, { date: "2026-05-04", notes: "" });

    expect(outcome).toEqual({ status: "saved" });
    expect(held().map((item) => item.period)).toEqual(["2026-B2"]);
  });

  it("um segundo registro do mesmo período substitui o primeiro, como o servidor fez", async () => {
    useRhythmStore.setState({ log: [entry({ notes: "primeira" })] });
    queue = [{ status: 200, data: entry({ date: "2026-05-11", notes: "corrigida" }) }];

    await useRhythmStore
      .getState()
      .logMeeting("bimestral_pi_campo", OCEANIA, { date: "2026-05-11", notes: "corrigida" });

    expect(held()).toEqual([entry({ date: "2026-05-11", notes: "corrigida" })]);
  });

  it("salvar consome o rascunho daquela linha e só dela", async () => {
    const other = draftKey("bimestral_pi_campo", "africa");
    useRhythmStore.setState({
      drafts: {
        [key]: { date: "2026-05-04", notes: "oceania" },
        [other]: { date: "2026-05-04", notes: "africa" },
      },
    });
    queue = [{ status: 201, data: entry({ notes: "oceania" }) }];

    await useRhythmStore
      .getState()
      .logMeeting("bimestral_pi_campo", OCEANIA, { date: "2026-05-04", notes: "oceania" });

    expect(useRhythmStore.getState().drafts).toEqual({
      [other]: { date: "2026-05-04", notes: "africa" },
    });
  });

  it("uma recusa não toca no log nem no rascunho: salvar de novo é o conserto", async () => {
    const draft = { date: "2026-12-31", notes: "o que se combinou" };
    useRhythmStore.setState({ drafts: { [key]: draft } });
    queue = [{ status: 422, data: { detail: "date: 2026-12-31 has not happened yet" } }];

    const outcome = await useRhythmStore
      .getState()
      .logMeeting("bimestral_pi_campo", OCEANIA, draft);

    expect(outcome.status).toBe("failed");
    expect(held()).toEqual([]);
    expect(useRhythmStore.getState().drafts[key]).toEqual(draft);
  });

  it("sem conexão, o rascunho também fica", async () => {
    const draft = { date: "2026-05-04", notes: "sem sinal" };
    useRhythmStore.setState({ drafts: { [key]: draft } });
    queue = [{ status: 503 }];

    await useRhythmStore.getState().logMeeting("bimestral_pi_campo", OCEANIA, draft);

    expect(useRhythmStore.getState().drafts[key]).toEqual(draft);
  });
});

describe("desfazer apaga no servidor", () => {
  it("o DELETE leva o período da entrada, e só ela sai", async () => {
    useRhythmStore.setState({
      log: [entry(), entry({ period: "2026-B2", date: "2026-04-20" }), entry({ scopeKey: "africa" })],
    });
    queue = [{ status: 204 }];

    await useRhythmStore.getState().undoMeeting("bimestral_pi_campo", OCEANIA, "2026-B3");

    expect(sent[0].method).toBe("delete");
    expect(sent[0].url).toBe("/shema/meetings/log/bimestral_pi_campo/oceania/2026-B3");
    expect(held()).toEqual([
      entry({ period: "2026-B2", date: "2026-04-20" }),
      entry({ scopeKey: "africa" }),
    ]);
  });

  it("um 404 quer dizer que já não existe lá, e a linha deixa de dizer em dia", async () => {
    useRhythmStore.setState({ log: [entry()] });
    queue = [{ status: 404 }];

    const outcome = await useRhythmStore
      .getState()
      .undoMeeting("bimestral_pi_campo", OCEANIA, "2026-B3");

    expect(outcome).toEqual({ status: "saved" });
    expect(held()).toEqual([]);
  });

  it("qualquer outra recusa deixa a entrada onde estava", async () => {
    useRhythmStore.setState({ log: [entry()] });
    queue = [{ status: 403 }];

    const outcome = await useRhythmStore
      .getState()
      .undoMeeting("bimestral_pi_campo", OCEANIA, "2026-B3");

    expect(outcome.status).toBe("failed");
    expect(held()).toEqual([entry()]);
  });
});

describe("uma nota digitada não é uma escrita", () => {
  it("fechar o diálogo não apaga o rascunho, e nada vai ao servidor", () => {
    useRhythmStore
      .getState()
      .setDraft(key, { date: "2026-05-04", notes: "combinamos revisar o pulso" });

    expect(useRhythmStore.getState().drafts[key]).toEqual({
      date: "2026-05-04",
      notes: "combinamos revisar o pulso",
    });
    expect(sent).toEqual([]);
  });

  it("descartar é explícito", () => {
    const { setDraft, clearDraft } = useRhythmStore.getState();
    setDraft(key, { date: "2026-05-04", notes: "some" });
    clearDraft(key);

    expect(useRhythmStore.getState().drafts[key]).toBeUndefined();
  });
});
