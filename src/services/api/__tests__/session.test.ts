import axios, { type InternalAxiosRequestConfig } from "axios";
import { beforeEach, describe, expect, it, vi } from "vitest";

const store = new Map<string, string>();

const memoryStorage = {
  getItem: (key: string) => store.get(key) ?? null,
  setItem: (key: string, value: string) => {
    store.set(key, value);
  },
  removeItem: (key: string) => {
    store.delete(key);
  },
  clear: () => store.clear(),
};

vi.stubGlobal("localStorage", memoryStorage);
vi.stubGlobal("window", { localStorage: memoryStorage });

const { http } = await import("../client");
const { authAPI, readSession, sessionAPI } = await import("../endpoints");
const { toApiFailure, UNKNOWN_VOCABULARY } = await import("../errors");
const { SESSION_ROLES } = await import("../../../constants/roles");
const { accessToken, forgetTokens, onSessionEvent, refreshToken } =
  await import("../tokens");

const RECORD_DRAFTS = "shema-record-drafts-v1";
const ASSESSMENT_DRAFTS = "shema-assessments-v1";

const HALF_FILLED_RECORD = JSON.stringify({
  state: {
    drafts: {
      kadiweu: { languageName: "Kadiwéu", notes: "meia hora de digitação" },
    },
  },
  version: 1,
});

const HALF_FILLED_ASSESSMENT = JSON.stringify({
  state: {
    drafts: {
      ashaninka: {
        emotional: "atencao",
        emotionalNote: "a equipe está cansada",
      },
    },
  },
  version: 1,
});

type Reply = { status: number; data?: unknown } | { networkCode: string };

let script: (url: string, attempt: number) => Reply;

const attempts = new Map<string, number>();

const adapter = async (config: InternalAxiosRequestConfig) => {
  const url = `${config.url ?? ""}`;
  const attempt = (attempts.get(url) ?? 0) + 1;
  attempts.set(url, attempt);

  const reply = script(url, attempt);
  if ("networkCode" in reply) {
    throw {
      isAxiosError: true,
      code: reply.networkCode,
      config,
      response: undefined,
    };
  }
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

const LOGIN_BODY = {
  user: { id: "u-1", email: "coord@shema.org", display_name: "Conta" },
  tokens: { access_token: "access-1", refresh_token: "refresh-1" },
};

beforeEach(() => {
  attempts.clear();
  forgetTokens("signedOut");
  store.clear();
  script = () => ({ status: 200 });
});

function refusal(payload: unknown): unknown {
  try {
    readSession(payload);
  } catch (error) {
    return error;
  }
  throw new Error("readSession aceitou uma sessão que devia recusar");
}

describe("GET /api/shema/session, como a BE-17 responde", () => {
  it("lê os cinco campos da sessão, e a lista na ordem em que o servidor mandou", () => {
    expect(
      readSession({
        role: "coordinator",
        roles: ["coordinator", "admin", "mesa"],
        regionScope: ["south-america"],
        name: "Nome do Organograma",
        apps: { resourceRequestForm: "https://formulario.exemplo.org" },
      }),
    ).toEqual({
      role: "coordinator",
      roles: ["coordinator", "admin", "mesa"],
      regionScope: ["south-america"],
      name: "Nome do Organograma",
      apps: { resourceRequestForm: "https://formulario.exemplo.org" },
    });
  });

  it("uma conta só com mesa, gestor ou admin passa, sem escopo regional", () => {
    for (const role of ["mesa", "gestor", "admin"]) {
      expect(
        readSession({ role, roles: [role], regionScope: [], name: null }),
      ).toMatchObject({ role, roles: [role], regionScope: [] });
    }
  });

  it("equipe, que o vínculo do projeto põe na sessão (OBT-524): a lista que o traz é aceita", () => {
    expect(
      readSession({ role: "equipe", roles: ["equipe"], regionScope: [] }).roles,
    ).toEqual(["equipe"]);
  });

  it("null em regionScope é global, e lista vazia não é a mesma coisa", () => {
    expect(
      readSession({
        role: "globalStrategist",
        roles: ["globalStrategist"],
        regionScope: null,
      }),
    ).toMatchObject({ regionScope: null });
    expect(
      readSession({
        role: "coordinator",
        roles: ["coordinator"],
        regionScope: [],
      }),
    ).toMatchObject({ regionScope: [] });
  });

  it("uma conta sem nome no organograma responde null, não string vazia", () => {
    const obtLab = { role: "obtLab", roles: ["obtLab"], regionScope: [] };
    expect(readSession({ ...obtLab, name: "" }).name).toBeNull();
    expect(readSession(obtLab).name).toBeNull();
  });

  it("um papel que este painel não conhece é recusa, não escopo estreitado", () => {
    expect(
      refusal({ role: "articulador", roles: ["articulador"], regionScope: [] }),
    ).toMatchObject({ kind: "invalid", code: UNKNOWN_VOCABULARY });
    expect(
      refusal({ role: null, roles: ["coordinator"], regionScope: null }),
    ).toMatchObject({ kind: "invalid", code: UNKNOWN_VOCABULARY });
  });

  it("um papel desconhecido na lista recusa a sessão inteira, nunca é descartado", () => {
    expect(
      refusal({
        role: "coordinator",
        roles: ["coordinator", "lider"],
        regionScope: ["africa"],
      }),
    ).toMatchObject({ kind: "invalid", code: UNKNOWN_VOCABULARY });
  });

  it("o papel transitório é o primeiro da lista, ou a sessão é recusada", () => {
    expect(
      refusal({ role: "coordinator", roles: ["admin", "mesa"], regionScope: [] }),
    ).toMatchObject({ kind: "invalid", code: UNKNOWN_VOCABULARY });
    expect(
      refusal({
        role: "mesa",
        roles: ["coordinator", "mesa"],
        regionScope: ["africa"],
      }),
    ).toMatchObject({ kind: "invalid", code: UNKNOWN_VOCABULARY });
  });

  it("o vocabulário é o do servidor, na mesma ordem de precedência", () => {
    expect(SESSION_ROLES).toEqual([
      "globalStrategist",
      "coordinator",
      "obtLab",
      "resourceCircle",
      "admin",
      "gestor",
      "mesa",
      "equipe",
    ]);
  });

  it("lista vazia é conta sem papel: a mesma recusa do 403", () => {
    expect(
      refusal({ role: null, roles: [], regionScope: null }),
    ).toMatchObject({ kind: "forbidden" });
  });

  it("uma resposta sem a lista é de servidor anterior à BE-17: recusa de vocabulário", () => {
    expect(
      refusal({ role: "coordinator", regionScope: ["africa"] }),
    ).toMatchObject({ kind: "invalid", code: UNKNOWN_VOCABULARY });
    expect(
      refusal({ role: "coordinator", roles: "coordinator", regionScope: [] }),
    ).toMatchObject({ kind: "invalid", code: UNKNOWN_VOCABULARY });
  });

  it("uma região que este painel não conhece também", () => {
    const coordinator = { role: "coordinator", roles: ["coordinator"] };
    expect(
      refusal({ ...coordinator, regionScope: ["antarctica"] }),
    ).toMatchObject({ code: UNKNOWN_VOCABULARY });
    expect(
      refusal({ ...coordinator, regionScope: "south-america" }),
    ).toMatchObject({ code: UNKNOWN_VOCABULARY });
  });

  it("os oito papéis do vocabulário e as sete regiões passam", () => {
    for (const role of SESSION_ROLES) {
      expect(readSession({ role, roles: [role], regionScope: null }).role).toBe(
        role,
      );
    }
    const every = [
      "south-america",
      "north-america",
      "africa",
      "asia",
      "oceania",
      "europe",
      "other",
    ];
    expect(
      readSession({
        role: "coordinator",
        roles: ["coordinator"],
        regionScope: every,
      }).regionScope,
    ).toEqual(every);
  });
});

describe("entrar e sair", () => {
  it("guarda os dois tokens que a plataforma devolve em snake_case", async () => {
    script = () => ({ status: 200, data: LOGIN_BODY });
    const account = await authAPI.signIn({
      email: "coord@shema.org",
      password: "12345678",
    });
    expect(account).toEqual({
      id: "u-1",
      email: "coord@shema.org",
      displayName: "Conta",
    });
    expect(accessToken()).toBe("access-1");
    expect(refreshToken()).toBe("refresh-1");
  });

  it("credencial recusada não deixa meia sessão para trás", async () => {
    script = () => ({ status: 401, data: { detail: "Invalid credentials" } });
    await expect(
      authAPI.signIn({ email: "coord@shema.org", password: "errada12" }),
    ).rejects.toMatchObject({ kind: "unauthorized" });
    expect(accessToken()).toBeNull();
  });

  it("sair revoga no servidor e esquece aqui", async () => {
    script = () => ({ status: 200, data: LOGIN_BODY });
    await authAPI.signIn({ email: "a@b.co", password: "12345678" });
    script = (url) =>
      url.includes("/auth/logout") ? { status: 204 } : { status: 200 };
    await authAPI.signOut();
    expect(accessToken()).toBeNull();
  });

  it("uma rede caída não prende ninguém numa sessão que já acabou", async () => {
    script = () => ({ status: 200, data: LOGIN_BODY });
    await authAPI.signIn({ email: "a@b.co", password: "12345678" });
    script = () => ({ networkCode: "ERR_NETWORK" });
    await expect(authAPI.signOut()).resolves.toBeUndefined();
    expect(accessToken()).toBeNull();
  });

  it("a sessão do Shemá é lida depois do login, com o bearer", async () => {
    script = (url) =>
      url.includes("/auth/login")
        ? { status: 200, data: LOGIN_BODY }
        : {
            status: 200,
            data: {
              role: "obtLab",
              roles: ["obtLab"],
              regionScope: ["africa"],
              name: "Ana",
            },
          };
    await authAPI.signIn({ email: "a@b.co", password: "12345678" });
    await expect(sessionAPI.get()).resolves.toEqual({
      role: "obtLab",
      roles: ["obtLab"],
      regionScope: ["africa"],
      name: "Ana",
      apps: { resourceRequestForm: null },
    });
  });

  it("uma conta só mesa passa pela porta e lê a própria sessão", async () => {
    script = (url) =>
      url.includes("/auth/login")
        ? { status: 200, data: LOGIN_BODY }
        : {
            status: 200,
            data: { role: "mesa", roles: ["mesa"], regionScope: [], name: null },
          };
    await authAPI.signIn({ email: "a@b.co", password: "12345678" });
    await expect(sessionAPI.get()).resolves.toMatchObject({
      role: "mesa",
      roles: ["mesa"],
    });
  });

  it("o 403 do servidor e a lista vazia chegam à entrada como a mesma recusa", async () => {
    script = (url) =>
      url.includes("/auth/login")
        ? { status: 200, data: LOGIN_BODY }
        : { status: 403, data: { detail: "no access" } };
    await authAPI.signIn({ email: "a@b.co", password: "12345678" });
    const refusedByServer = await sessionAPI.get().catch(toApiFailure);

    script = () => ({
      status: 200,
      data: { role: null, roles: [], regionScope: null, name: null },
    });
    const refusedHere = await sessionAPI.get().catch(toApiFailure);

    expect(refusedByServer).toMatchObject({ kind: "forbidden" });
    expect(refusedHere).toMatchObject({ kind: "forbidden" });
  });
});

describe("a sessão expira e o trabalho não salvo continua onde estava", () => {
  it("nada em localStorage é tocado quando a sessão cai", async () => {
    script = () => ({ status: 200, data: LOGIN_BODY });
    await authAPI.signIn({ email: "a@b.co", password: "12345678" });

    store.set(RECORD_DRAFTS, HALF_FILLED_RECORD);
    store.set(ASSESSMENT_DRAFTS, HALF_FILLED_ASSESSMENT);
    const before = new Map(store);

    const seen: string[] = [];
    const stop = onSessionEvent((event) => seen.push(event));

    attempts.clear();
    script = () => ({ status: 401, data: { detail: "expired" } });
    await expect(http.get("/shema/projects")).rejects.toMatchObject({
      kind: "unauthorized",
    });
    stop();

    expect(seen).toEqual(["expired"]);
    expect(accessToken()).toBeNull();
    expect(store).toEqual(before);
    expect(store.get(RECORD_DRAFTS)).toBe(HALF_FILLED_RECORD);
    expect(store.get(ASSESSMENT_DRAFTS)).toBe(HALF_FILLED_ASSESSMENT);
  });

  it("entrar de novo depois de expirar não apaga o que estava digitado", async () => {
    store.set(RECORD_DRAFTS, HALF_FILLED_RECORD);
    script = () => ({ status: 200, data: LOGIN_BODY });
    await authAPI.signIn({ email: "a@b.co", password: "12345678" });
    expect(store.get(RECORD_DRAFTS)).toBe(HALF_FILLED_RECORD);
  });

  it("sair também não é uma vassoura: os rascunhos são do navegador, não da sessão", async () => {
    script = () => ({ status: 200, data: LOGIN_BODY });
    await authAPI.signIn({ email: "a@b.co", password: "12345678" });
    store.set(RECORD_DRAFTS, HALF_FILLED_RECORD);
    script = () => ({ status: 204 });
    await authAPI.signOut();
    expect(store.get(RECORD_DRAFTS)).toBe(HALF_FILLED_RECORD);
  });
});
