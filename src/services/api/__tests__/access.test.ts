import axios, { type InternalAxiosRequestConfig } from "axios";
import { beforeEach, describe, expect, it } from "vitest";
import { ANONYMOUS, apiSessionReducer, personaOf } from "../../../contexts/apiSession";
import { GRANTABLE_ROLES } from "../../../constants/access";
import { UNKNOWN_VOCABULARY, failureMessage, isApiFailure } from "../errors";
import { forgetTokens, hasSession, onSessionEvent } from "../tokens";

const { http } = await import("../client");
const { accessAPI, authAPI, readAccount, sessionAPI } = await import("../endpoints");

interface Call {
  method: string;
  path: string;
  body: unknown;
  bearer: string | null;
  params: unknown;
}

type Reply = { status: number; data?: unknown };

let script: (call: Call) => Reply = () => ({ status: 200 });
let calls: Call[] = [];

function pathOf(url: string | undefined): string {
  const raw = url ?? "";
  return raw.startsWith("/api/") ? raw.slice("/api".length) : raw;
}

const adapter = async (config: InternalAxiosRequestConfig) => {
  const header = config.headers?.Authorization;
  const call: Call = {
    method: config.method ?? "",
    path: pathOf(config.url),
    body: typeof config.data === "string" ? JSON.parse(config.data) : null,
    bearer: typeof header === "string" ? header : null,
    params: config.params ?? null,
  };
  calls.push(call);
  const reply = script(call);
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

const events: string[] = [];
onSessionEvent((event) => events.push(event));

beforeEach(() => {
  forgetTokens("signedOut");
  calls = [];
  events.length = 0;
  script = () => ({ status: 200 });
});

const ACCOUNT = {
  userId: "u-9",
  email: "pessoa@exemplo.org",
  displayName: "Pessoa Exemplo",
  isActive: true,
  apps: [
    { appKey: "shema", roles: ["coordinator"] },
    { appKey: "resource-request-form", roles: ["gestor"] },
  ],
  regions: [{ regionKey: "africa", grantedBy: "u-1", grantedAt: "2026-09-27T10:00:00Z" }],
  regionScope: ["africa"],
};

function refusalOf(payload: unknown): unknown {
  try {
    readAccount(payload);
  } catch (error) {
    return error;
  }
  throw new Error("readAccount aceitou uma conta que devia recusar");
}

describe("as sete rotas do Admin, como a OBT-543 as serve", () => {
  it("a busca é um GET com o e-mail exato em query, e devolve a conta lida", async () => {
    script = () => ({ status: 200, data: ACCOUNT });
    const account = await accessAPI.person("pessoa@exemplo.org");
    expect(calls[0]).toMatchObject({
      method: "get",
      path: "/shema/access/people",
      params: { email: "pessoa@exemplo.org" },
    });
    expect(account.apps[0].roles).toEqual(["coordinator"]);
    expect(account.regionScope).toEqual(["africa"]);
  });

  it("conceder manda as regiões na mesma chamada, em camelCase", async () => {
    script = () => ({ status: 200, data: ACCOUNT });
    await accessAPI.grant({
      userId: "u-9",
      appKey: "shema",
      roleKey: "coordinator",
      regionKeys: ["africa", "asia"],
    });
    expect(calls[0]).toMatchObject({
      method: "post",
      path: "/shema/access/grants",
      body: { userId: "u-9", appKey: "shema", roleKey: "coordinator", regionKeys: ["africa", "asia"] },
    });
  });

  it("revogar, convidar, recolher convite, listar convites e ler o histórico vão cada um à sua rota", async () => {
    script = (call) =>
      call.path.endsWith("/grants/revoke")
        ? { status: 200, data: ACCOUNT }
        : call.path.endsWith("/invites") && call.method === "post"
          ? { status: 201, data: { id: "i-1", inviteUrl: "https://pme/convite?token=x" } }
          : { status: 200, data: [] };
    await accessAPI.revoke({ userId: "u-9", appKey: "resource-request-form", roleKey: "gestor" });
    await accessAPI.invite({ email: "novo@exemplo.org", appKey: "shema", roleKey: "obtLab", regionKeys: ["asia"] });
    await accessAPI.revokeInvite("i-1");
    await accessAPI.invites();
    await accessAPI.changes();
    expect(calls.map((call) => `${call.method} ${call.path}`)).toEqual([
      "post /shema/access/grants/revoke",
      "post /shema/access/invites",
      "post /shema/access/invites/revoke",
      "get /shema/access/invites",
      "get /shema/access/changes",
    ]);
    expect(calls[2].body).toEqual({ inviteId: "i-1" });
  });

  it("a recusa de regional sem região chega como a frase do servidor", async () => {
    const sentence = "'coordinator' is a regional role: grant it with at least one region.";
    script = () => ({ status: 422, data: { detail: sentence, code: "UNPROCESSABLE_VALUE" } });
    const refusal = await accessAPI
      .grant({ userId: "u-9", appKey: "shema", roleKey: "coordinator", regionKeys: [] })
      .then(
        () => null,
        (raw: unknown) => raw,
      );
    expect(isApiFailure(refusal)).toBe(true);
    if (isApiFailure(refusal)) expect(failureMessage(refusal, (key) => key)).toBe(sentence);
  });
});

describe("os projetos aguardando confirmação — OBT-547", () => {
  it("a lista, a confirmação e o descarte vão cada um à sua rota, com o id codificado", async () => {
    script = () => ({ status: 200, data: [] });
    await accessAPI.pendingProjects();
    await accessAPI.confirmProject("p 1", {
      languageName: "Língua Teste",
      languageCode: "ltt",
      location: "Peru",
      team: "Base Teste",
      sensitiveCountry: true,
      members: [{ name: "Joana Teste", email: "equipe@exemplo.org" }],
    });
    await accessAPI.discardProject("p 1", "duplicado");
    expect(calls.map((call) => `${call.method} ${call.path}`)).toEqual([
      "get /shema/pending-projects",
      "post /shema/projects/p%201/confirm",
      "post /shema/projects/p%201/reject",
    ]);
    expect(calls[1].body).toMatchObject({ sensitiveCountry: true, languageName: "Língua Teste" });
    expect(calls[2].body).toEqual({ reason: "duplicado" });
  });
});

describe("readAccount falha fechado, como readSession", () => {
  it("lê a conta legal inteira", () => {
    expect(readAccount(ACCOUNT)).toEqual(ACCOUNT);
  });

  it("recusa um papel bem-formado fora do vocabulário, em vez de encolher a lista", () => {
    const refusal = refusalOf({
      ...ACCOUNT,
      apps: [{ appKey: "shema", roles: ["coordinator", "banana"] }],
    });
    expect(refusal).toMatchObject({ kind: "invalid", code: UNKNOWN_VOCABULARY });
  });

  it("recusa um papel real no app errado — mesa não é papel do console", () => {
    expect(
      refusalOf({ ...ACCOUNT, apps: [{ appKey: "shema", roles: ["mesa"] }] }),
    ).toMatchObject({ code: UNKNOWN_VOCABULARY });
  });

  it("recusa um app e uma região que o console não conhece", () => {
    expect(
      refusalOf({ ...ACCOUNT, apps: [{ appKey: "outro-app", roles: [] }] }),
    ).toMatchObject({ code: UNKNOWN_VOCABULARY });
    expect(
      refusalOf({ ...ACCOUNT, regionScope: ["atlantida"] }),
    ).toMatchObject({ code: UNKNOWN_VOCABULARY });
  });

  it("aceita o escopo global (null) e o vazio", () => {
    expect(readAccount({ ...ACCOUNT, regionScope: null }).regionScope).toBeNull();
    expect(readAccount({ ...ACCOUNT, regionScope: [] }).regionScope).toEqual([]);
  });

  it("o vocabulário concedível é o do servidor, na ordem da sessão", () => {
    expect(GRANTABLE_ROLES).toEqual({
      shema: ["globalStrategist", "coordinator", "obtLab", "resourceCircle", "admin"],
      "resource-request-form": ["admin", "gestor", "mesa"],
    });
  });
});

describe("o convidado — describeInvite e join", () => {
  it("o convite é lido pela rota genérica do formulário, com o token codificado, e mapeado para camelCase", async () => {
    script = () => ({
      status: 200,
      data: {
        status: "pending",
        email: "novo@exemplo.org",
        app_name: "Shemá",
        role_key: "obtLab",
        role_label: "OBT Lab",
        account_exists: false,
        region_keys: ["asia"],
      },
    });
    const invite = await accessAPI.describeInvite("a b/c");
    expect(calls[0].path).toBe("/resource-requests/access/invites/a%20b%2Fc");
    expect(invite).toEqual({
      status: "pending",
      email: "novo@exemplo.org",
      roleKey: "obtLab",
      accountExists: false,
      regionKeys: ["asia"],
    });
  });

  const LOGIN = {
    user: { id: "u-new", email: "novo@exemplo.org", display_name: null },
    tokens: { access_token: "guest-access", refresh_token: "guest-refresh" },
  };

  it("cadastra, aceita com o bearer do próprio par e sai — sem nunca tocar o cofre de tokens", async () => {
    script = (call) =>
      call.path === "/auth/signup" ? { status: 201, data: LOGIN } : { status: 200, data: {} };
    const outcome = await accessAPI.join("tok", {
      email: "novo@exemplo.org",
      password: "senha-longa",
      displayName: "Nome",
      create: true,
    });
    expect(outcome).toEqual({ ok: true });
    expect(calls.map((call) => call.path)).toEqual([
      "/auth/signup",
      "/resource-requests/access/invites/tok/accept",
      "/auth/logout",
    ]);
    expect(calls[0].body).toEqual({
      email: "novo@exemplo.org",
      password: "senha-longa",
      display_name: "Nome",
    });
    expect(calls[1].bearer).toBe("Bearer guest-access");
    expect(calls[2].body).toEqual({ refresh_token: "guest-refresh" });
    expect(hasSession()).toBe(false);
    expect(events).toEqual([]);
  });

  it("quem já tem conta entra em vez de cadastrar", async () => {
    script = (call) =>
      call.path === "/auth/login" ? { status: 200, data: LOGIN } : { status: 200, data: {} };
    await accessAPI.join("tok", {
      email: "novo@exemplo.org",
      password: "senha-longa",
      displayName: null,
      create: false,
    });
    expect(calls[0]).toMatchObject({
      path: "/auth/login",
      body: { email: "novo@exemplo.org", password: "senha-longa" },
    });
  });

  it("aceite recusado ainda sai do par, e diz que a conta já foi criada", async () => {
    script = (call) =>
      call.path === "/auth/signup"
        ? { status: 201, data: LOGIN }
        : call.path.endsWith("/accept")
          ? { status: 409, data: { detail: "This invitation has expired." } }
          : { status: 204 };
    const outcome = await accessAPI.join("tok", {
      email: "novo@exemplo.org",
      password: "senha-longa",
      displayName: null,
      create: true,
    });
    expect(outcome).toMatchObject({ ok: false, stage: "accept", accountCreated: true });
    expect(calls.at(-1)?.path).toBe("/auth/logout");
    expect(hasSession()).toBe(false);
    expect(events).toEqual([]);
  });

  it("senha recusada não aceita nada e não deixa par para trás", async () => {
    script = () => ({ status: 401, data: { detail: "Invalid credentials" } });
    const outcome = await accessAPI.join("tok", {
      email: "novo@exemplo.org",
      password: "errada-123",
      displayName: null,
      create: false,
    });
    expect(outcome).toMatchObject({
      ok: false,
      stage: "auth",
      accountCreated: false,
      failure: { kind: "unauthorized" },
    });
    expect(calls.map((call) => call.path)).toEqual(["/auth/login"]);
    expect(events).toEqual([]);
  });

  it("depois do aceite, a sessão que o provedor prova já carrega o papel", async () => {
    const granted = new Set<string>();
    script = (call) => {
      if (call.path === "/auth/signup" || call.path === "/auth/login") {
        return { status: 200, data: LOGIN };
      }
      if (call.path.endsWith("/accept")) {
        granted.add("obtLab");
        return { status: 200, data: {} };
      }
      if (call.path === "/shema/session") {
        const roles = [...granted];
        return roles.length === 0
          ? { status: 403, data: { detail: "no role" } }
          : { status: 200, data: { role: roles[0], roles, regionScope: ["asia"], name: null } };
      }
      return { status: 204 };
    };

    const outcome = await accessAPI.join("tok", {
      email: "novo@exemplo.org",
      password: "senha-longa",
      displayName: null,
      create: true,
    });
    expect(outcome.ok).toBe(true);

    const account = await authAPI.signIn({ email: "novo@exemplo.org", password: "senha-longa" });
    const session = await sessionAPI.get();
    const state = [
      { type: "proving" as const },
      { type: "proved" as const, accountId: account.id, session },
    ].reduce(apiSessionReducer, ANONYMOUS);

    expect(state.status).toBe("ready");
    expect(personaOf(state.signed).roles).toContain("obtLab");
    expect(personaOf(state.signed).regionScope).toEqual(["asia"]);
  });
});
