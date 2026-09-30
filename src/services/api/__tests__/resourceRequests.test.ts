import axios, { type InternalAxiosRequestConfig } from "axios";
import { beforeEach, describe, expect, it } from "vitest";
import { UNKNOWN_VOCABULARY } from "../errors";
import { forgetTokens } from "../tokens";

const { http } = await import("../client");
const { authAPI, readApps, readSession } = await import("../endpoints");
const { readCard, readIssuedLink, readLink, resourceRequestsAPI } = await import(
  "../resourceRequests"
);

interface Call {
  method: string;
  path: string;
  body: unknown;
}

let script: (call: Call) => { status: number; data?: unknown } = () => ({ status: 200 });
let calls: Call[] = [];

const adapter = async (config: InternalAxiosRequestConfig) => {
  const raw = config.url ?? "";
  const call: Call = {
    method: config.method ?? "",
    path: raw.startsWith("/api/") ? raw.slice("/api".length) : raw,
    body: typeof config.data === "string" ? JSON.parse(config.data) : null,
  };
  calls.push(call);
  const reply = script(call);
  const response = { data: reply.data ?? null, status: reply.status, statusText: "", headers: {}, config };
  if (reply.status >= 200 && reply.status < 300) return response;
  throw { isAxiosError: true, code: "ERR_BAD_REQUEST", config, response };
};

http.defaults.adapter = adapter;
axios.defaults.adapter = adapter;

beforeEach(() => {
  forgetTokens("signedOut");
  calls = [];
  script = () => ({ status: 200 });
});

const CARD = {
  id: "r-1",
  reg_name: "Pedido Exemplo",
  request_type: "treinamento",
  amount_requested: "2500.00",
  currency: "USD",
  stage: "analise",
  created_at: "2026-09-20T12:00:00+00:00",
  submitted_at: "2026-09-21T12:00:00+00:00",
  endorsed: true,
  decision: null,
  open: false,
  can_edit: false,
  started_by_name: null,
};

const LINK = {
  id: "l-1",
  email: "pessoa@exemplo.org",
  project_hint: "equipe exemplo",
  status: "pending",
  expires_at: "2026-11-28T12:00:00+00:00",
  verified_at: null,
  revoked_at: null,
  created_by: "u-admin",
  created_at: "2026-09-29T12:00:00+00:00",
};

const refusedWith = (read: () => unknown) => {
  try {
    read();
  } catch (error) {
    return error;
  }
  throw new Error("o leitor aceitou o que devia recusar");
};

describe("apps na sessão — o endereço do formulário vem do servidor", () => {
  it("lê o endereço e tira a barra final", () => {
    expect(readApps({ resourceRequestForm: "https://formulario.exemplo.org/" })).toEqual({
      resourceRequestForm: "https://formulario.exemplo.org",
    });
  });

  it("sem endereço, ou de um servidor anterior à OBT-544, é null — nunca um valor inventado", () => {
    expect(readApps(undefined)).toEqual({ resourceRequestForm: null });
    expect(readApps(null)).toEqual({ resourceRequestForm: null });
    expect(readApps({})).toEqual({ resourceRequestForm: null });
    expect(readApps({ resourceRequestForm: "" })).toEqual({ resourceRequestForm: null });
    expect(readApps(["https://formulario.exemplo.org"])).toEqual({ resourceRequestForm: null });
  });

  it("só http e https passam — o endereço vira uma aba que o PME abre", () => {
    for (const hostile of [
      "javascript:alert(1)",
      "data:text/html,oi",
      "formulario.exemplo.org",
      42,
    ]) {
      expect(readApps({ resourceRequestForm: hostile }), String(hostile)).toEqual({
        resourceRequestForm: null,
      });
    }
  });

  it("a sessão sem apps continua valendo — o que falta é só o formulário", () => {
    const session = readSession({ role: "mesa", roles: ["mesa"], regionScope: [], name: null });
    expect(session.apps).toEqual({ resourceRequestForm: null });
  });
});

describe("POST /api/auth/handoff — a passagem da BE-21", () => {
  const signIn = async () => {
    script = (call) =>
      call.path === "/auth/login"
        ? {
            status: 200,
            data: {
              user: { id: "u-1", email: "pessoa@exemplo.org", display_name: null },
              tokens: { access_token: "acesso", refresh_token: "sessao-viva" },
            },
          }
        : { status: 201, data: { code: "codigo-de-um-minuto", expires_at: "2026-09-30T00:01:00Z" } };
    await authAPI.signIn({ email: "pessoa@exemplo.org", password: "12345678" });
    calls = [];
  };

  it("pede o código com a chave do app, o refresh token da sessão e o contexto, e devolve só o código", async () => {
    await signIn();
    const code = await authAPI.handoff("resource-request-form", { projectId: "kadiweu" });

    expect(code).toBe("codigo-de-um-minuto");
    expect(calls).toEqual([
      {
        method: "post",
        path: "/auth/handoff",
        body: {
          app_key: "resource-request-form",
          refresh_token: "sessao-viva",
          context: { projectId: "kadiweu" },
        },
      },
    ]);
  });

  it("sem sessão não pede nada — a passagem abriria o formulário como ninguém", async () => {
    await expect(authAPI.handoff("resource-request-form", null)).rejects.toMatchObject({
      kind: "unauthorized",
    });
    expect(calls).toEqual([]);
  });
});

describe("o cartão da BE-24 — a projeção e nada além dela", () => {
  it("lê os treze campos no nome exato que o servidor responde", () => {
    expect(readCard(CARD)).toEqual(CARD);
  });

  it("um campo a mais no fio não chega à tela — avaliação, local e base ficam de fora", () => {
    const widened = {
      ...CARD,
      scores: { alinhamento: 4 },
      comments: "NOTA-DA-MESA",
      team_note: "RECADO-PARA-A-EQUIPE",
      evaluator: "u-mesa",
      location: "LOCAL-SENSIVEL",
      base: "BASE-SENSIVEL",
    };
    const read = readCard(widened);
    expect(Object.keys(read).sort()).toEqual(Object.keys(CARD).sort());
    expect(JSON.stringify(read)).not.toMatch(/NOTA-DA-MESA|RECADO|LOCAL-SENSIVEL|BASE-SENSIVEL|u-mesa/u);
  });

  it("um valor numérico vira texto, como o Decimal do servidor", () => {
    expect(readCard({ ...CARD, amount_requested: 2500 }).amount_requested).toBe("2500");
    expect(readCard({ ...CARD, amount_requested: null }).amount_requested).toBeNull();
  });

  it("vocabulário desconhecido recusa o cartão, em vez de rotular errado", () => {
    for (const broken of [
      { ...CARD, stage: "arquivado" },
      { ...CARD, request_type: "viagem" },
      { ...CARD, currency: "GBP" },
      { ...CARD, decision: "talvez" },
      { ...CARD, open: "sim" },
      null,
    ]) {
      expect(refusedWith(() => readCard(broken))).toMatchObject({
        kind: "invalid",
        code: UNKNOWN_VOCABULARY,
      });
    }
  });
});

describe("o link externo da BE-26 — o token e o código só na resposta da emissão", () => {
  it("a lista não carrega token nem código, mesmo que o fio carregue", () => {
    const listed = readLink({ ...LINK, token: "t", code: "123456" });
    expect(listed).toEqual(LINK);
    expect(listed).not.toHaveProperty("token");
    expect(listed).not.toHaveProperty("code");
  });

  it("a emissão carrega os dois", () => {
    expect(readIssuedLink({ ...LINK, token: "tok", code: "004200" })).toEqual({
      ...LINK,
      token: "tok",
      code: "004200",
    });
  });

  it("status fora dos quatro recusa o link", () => {
    expect(refusedWith(() => readLink({ ...LINK, status: "used" }))).toMatchObject({
      kind: "invalid",
    });
  });
});

describe("as rotas que a camada chama", () => {
  it("os cartões do projeto, com o id no caminho", async () => {
    script = () => ({ status: 200, data: [CARD] });
    await expect(resourceRequestsAPI.projectRequests("projeto/1")).resolves.toEqual([CARD]);
    expect(calls).toEqual([
      { method: "get", path: "/resource-requests/projects/projeto%2F1/requests", body: null },
    ]);
  });

  it("emitir, listar e revogar", async () => {
    script = (call) =>
      call.method === "post" && call.path === "/resource-requests/links"
        ? { status: 201, data: { ...LINK, token: "tok", code: "123456" } }
        : call.path.endsWith("/revoke")
          ? { status: 200, data: { ...LINK, status: "revoked" } }
          : { status: 200, data: [LINK] };

    await resourceRequestsAPI.issueLink({ email: "pessoa@exemplo.org", project_hint: "equipe" });
    await resourceRequestsAPI.links();
    await resourceRequestsAPI.revokeLink("l-1");

    expect(calls).toEqual([
      {
        method: "post",
        path: "/resource-requests/links",
        body: { email: "pessoa@exemplo.org", project_hint: "equipe" },
      },
      { method: "get", path: "/resource-requests/links", body: null },
      { method: "post", path: "/resource-requests/links/l-1/revoke", body: null },
    ]);
  });
});
