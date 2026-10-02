import axios, { AxiosError, type InternalAxiosRequestConfig } from "axios";
import { beforeEach, describe, expect, it } from "vitest";

/**
 * The bell and the header's data dialogs against the server (INT-11 · OBT-416, BE-15 and
 * BE-14). What the DoD asks, read on the wire: the panel, its read mark and the preferences are
 * the server's; the export is a file the server built, asked for with its format and language;
 * the import sends the file's bytes and reads the server's own refusal keys.
 */
const { http } = await import("../client");
const {
  notificationsAPI,
  readImportRefusal,
  readNotificationPrefs,
  readServedPanel,
  transferAPI,
} = await import("../endpoints");

interface Call {
  method: string;
  path: string;
  params: unknown;
  body: unknown;
  responseType: unknown;
}

let calls: Call[] = [];
let reply: { status: number; data: unknown; headers: Record<string, string> } = {
  status: 200,
  data: [],
  headers: {},
};

const adapter = async (config: InternalAxiosRequestConfig) => {
  const raw = config.url ?? "";
  calls.push({
    method: config.method ?? "",
    path: raw.startsWith("/api/") ? raw.slice("/api".length) : raw,
    params: config.params ?? null,
    body: config.data ?? null,
    responseType: config.responseType ?? null,
  });
  const response = { ...reply, statusText: "", config };
  const passes = config.validateStatus?.(reply.status) ?? reply.status < 400;
  if (!passes) {
    throw new AxiosError("refused", "ERR_BAD_REQUEST", config, null, response);
  }
  return response;
};

http.defaults.adapter = adapter;
axios.defaults.adapter = adapter;

beforeEach(() => {
  calls = [];
  reply = { status: 200, data: [], headers: {} };
});

const ROWS = [
  {
    id: "n-1",
    kind: "health",
    title: "",
    body: "",
    urgent: true,
    projectId: "tikuna-brazil",
    region: "south-america",
    createdAt: "2026-09-30T14:00:00Z",
    isRead: true,
    facts: {
      languageName: "Tikuna",
      assessedOn: "2026-09-30",
      needCount: null,
      needCategories: [],
      needTotals: [],
      submittedBy: null,
      daysSinceUpdate: null,
      place: null,
    },
  },
  {
    id: "n-2",
    kind: "requestDecision",
    title: "A resource request was decided",
    body: "…",
    urgent: false,
    projectId: null,
    createdAt: "2026-09-29T10:00:00Z",
    isRead: false,
    requestName: "Tradução do Evangelho",
    requestStage: "aprovado",
  },
  { id: "n-3", kind: "telegram", body: "", urgent: false, createdAt: "2026-09-29T10:00:00Z" },
  {
    id: "n-4",
    kind: "requestDecision",
    urgent: false,
    createdAt: "2026-09-29T10:00:00Z",
    requestName: "x",
    requestStage: "analise",
  },
  {
    id: "n-5",
    kind: "need",
    title: "",
    body: "",
    urgent: true,
    projectId: null,
    region: "a-region-this-console-does-not-know",
    createdAt: "2026-09-28T10:00:00Z",
    facts: {
      languageName: "",
      assessedOn: null,
      needCount: 2,
      needCategories: ["financial", "security"],
      needTotals: [{ amount: "5000.00", currency: "BRL" }],
      submittedBy: null,
      daysSinceUpdate: null,
      place: null,
    },
  },
  {
    id: "n-6",
    kind: "need",
    title: "",
    body: "",
    urgent: true,
    projectId: null,
    region: null,
    createdAt: "2026-09-27T10:00:00Z",
    facts: null,
  },
];

describe("o painel do sino", () => {
  it("lê do servidor, e só do servidor", async () => {
    reply = { status: 200, data: ROWS, headers: {} };

    const panel = await notificationsAPI.list();

    expect(calls.map((call) => `${call.method} ${call.path}`)).toEqual([
      "get /shema/notifications",
    ]);
    expect(panel.entries.map((entry) => entry.id)).toEqual(["n-1", "n-2", "n-5", "n-6"]);
  });

  it("o lido vem do servidor, então vale em qualquer aparelho", () => {
    expect(readServedPanel(ROWS).readIds).toEqual(["n-1"]);
  });

  it("um aviso de projeto chega com os fatos, para a frase sair aqui; um de pedido, com nome e etapa", () => {
    const [health, decision] = readServedPanel(ROWS).entries;

    expect(health).toMatchObject({
      origin: "server",
      kind: "health",
      urgent: true,
      projectId: "tikuna-brazil",
      facts: { languageName: "Tikuna", region: "south-america", assessedOn: "2026-09-30" },
    });
    expect(health).not.toHaveProperty("body");
    expect(decision).toMatchObject({
      kind: "requestDecision",
      requestName: "Tradução do Evangelho",
      requestStage: "aprovado",
    });
  });

  it("uma região que o console não conhece vira nenhuma região, e um aviso antigo chega sem fatos (OBT-559)", () => {
    const entries = readServedPanel(ROWS).entries;
    const need = entries.find((entry) => entry.id === "n-5");
    const old = entries.find((entry) => entry.id === "n-6");

    expect(need).toMatchObject({
      facts: {
        region: null,
        needCount: 2,
        needCategories: ["financial", "security"],
        needTotals: [{ amount: "5000.00", currency: "BRL" }],
        place: null,
      },
    });
    expect(old).toMatchObject({ kind: "need", projectId: null, facts: null });
  });

  it("um tipo desconhecido ou uma etapa que não é decisão cai fora em vez de ser adivinhada", () => {
    const ids = readServedPanel(ROWS).entries.map((entry) => entry.id);

    expect(ids).not.toContain("n-3");
    expect(ids).not.toContain("n-4");
  });

  it("marcar como lido manda os ids ao servidor", async () => {
    await notificationsAPI.markRead(["n-2"]);

    expect(calls).toMatchObject([
      { method: "post", path: "/shema/notifications/read", body: JSON.stringify({ ids: ["n-2"] }) },
    ]);
  });
});

describe("as preferências", () => {
  it("são lidas e gravadas no servidor", async () => {
    reply = {
      status: 200,
      data: {
        enabled: true,
        channels: { email: true, push: false, whatsapp: false },
        when: "urgent",
        scope: "custom",
        emailAddr: "a@b.org",
        phoneAddr: "",
        customProjectIds: ["tikuna-brazil"],
      },
      headers: {},
    };

    const prefs = await notificationsAPI.prefs();
    await notificationsAPI.savePrefs(prefs);

    expect(calls.map((call) => `${call.method} ${call.path}`)).toEqual([
      "get /shema/notifications/prefs",
      "put /shema/notifications/prefs",
    ]);
    expect(prefs).toMatchObject({ when: "urgent", scope: "custom" });
  });

  it("quem nunca salvou recebe o padrão da tela, não uma escolha vazia", () => {
    const prefs = readNotificationPrefs({
      enabled: true,
      channels: { email: false, push: false, whatsapp: false },
      when: "",
      scope: "",
      emailAddr: "",
      phoneAddr: "",
      customProjectIds: [],
    });

    expect(prefs.when).toBe("now");
    expect(prefs.scope).toBe("all");
  });
});

describe("a exportação", () => {
  it("é o arquivo do servidor, no formato e na língua pedidos, com o nome que ele dá", async () => {
    reply = {
      status: 200,
      data: new Blob(["id;Nome"]),
      headers: { "content-disposition": 'attachment; filename="shema-projetos-2026-10-01.csv"' },
    };

    const file = await transferAPI.exportProjects("csv", "en", () => undefined);

    expect(calls).toMatchObject([
      {
        method: "get",
        path: "/shema/export/projects",
        params: { format: "csv", lang: "en" },
        responseType: "blob",
      },
    ]);
    expect(file.fileName).toBe("shema-projetos-2026-10-01.csv");
  });

  it("sem o nome no cabeçalho, o arquivo ainda sai com a extensão do formato", async () => {
    reply = { status: 200, data: new Blob(["{}"]), headers: {} };

    const file = await transferAPI.exportProjects("json", "pt-BR", () => undefined);

    expect(file.fileName).toBe("shema-projetos.json");
  });
});

describe("a importação", () => {
  it("manda os bytes do arquivo como estão e lê o que foi aplicado e o que foi ignorado", async () => {
    reply = { status: 200, data: { applied: 2, ignoredFields: ["mediaPhotos"] }, headers: {} };
    const raw = '[{"id":"a"},{"id":"b"}]';

    const answer = await transferAPI.importProjects(raw);

    expect(calls).toMatchObject([{ method: "post", path: "/shema/import/projects", body: raw }]);
    expect(answer).toEqual({ ok: true, applied: 2, ignoredFields: ["mediaPhotos"] });
  });

  it("a recusa do arquivo chega com a chave do servidor e o item", async () => {
    reply = {
      status: 400,
      data: { detail: "…", code: "bad_request", key: "import_bad_record", index: 3 },
      headers: {},
    };

    const answer = await transferAPI.importProjects("[]");

    expect(answer).toEqual({ ok: false, error: { key: "import_bad_record", index: 3 } });
  });

  it("um 409 ou um 403 não vira registro quebrado: é falha, e a tela lê como falha", async () => {
    reply = { status: 409, data: { detail: "changed" }, headers: {} };

    await expect(transferAPI.importProjects("[]")).rejects.toMatchObject({
      kind: "conflict",
      status: 409,
    });
  });

  it("uma chave que o diálogo não conhece não é recusa do arquivo", () => {
    expect(readImportRefusal({ key: "import_something_new" })).toBeNull();
    expect(readImportRefusal({ key: "import_bad_record" })).toBeNull();
  });
});
