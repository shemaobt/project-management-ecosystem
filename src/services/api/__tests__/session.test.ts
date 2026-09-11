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
const { UNKNOWN_VOCABULARY } = await import("../errors");
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
    throw { code: reply.networkCode, config, response: undefined };
  }
  const response = {
    data: reply.data ?? null,
    status: reply.status,
    statusText: "",
    headers: {},
    config,
  };
  if (reply.status >= 200 && reply.status < 300) return response;
  throw { code: "ERR_BAD_REQUEST", config, response };
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

describe("GET /api/shema/session, como a BE-03 responde", () => {
  it("lê os três campos que o contrato congelou", () => {
    expect(
      readSession({
        role: "coordinator",
        regionScope: ["south-america"],
        name: "Nome do Organograma",
      }),
    ).toEqual({
      role: "coordinator",
      regionScope: ["south-america"],
      name: "Nome do Organograma",
    });
  });

  it("null em regionScope é global, e lista vazia não é a mesma coisa", () => {
    expect(
      readSession({ role: "globalStrategist", regionScope: null }),
    ).toMatchObject({ regionScope: null });
    expect(readSession({ role: "coordinator", regionScope: [] })).toMatchObject(
      {
        regionScope: [],
      },
    );
  });

  it("uma conta sem nome no organograma responde null, não string vazia", () => {
    expect(
      readSession({ role: "obtLab", regionScope: [], name: "" }).name,
    ).toBeNull();
    expect(readSession({ role: "obtLab", regionScope: [] }).name).toBeNull();
  });

  it("um papel que este painel não conhece é recusa, não escopo estreitado", () => {
    expect(() =>
      readSession({ role: "articulador", regionScope: [] }),
    ).toThrow();
    try {
      readSession({ role: null, regionScope: null });
    } catch (error) {
      expect(error).toMatchObject({
        kind: "invalid",
        code: UNKNOWN_VOCABULARY,
      });
    }
  });

  it("uma região que este painel não conhece também", () => {
    expect(() =>
      readSession({ role: "coordinator", regionScope: ["antarctica"] }),
    ).toThrow();
    expect(() =>
      readSession({ role: "coordinator", regionScope: "south-america" }),
    ).toThrow();
  });

  it("as sete regiões e os quatro papéis do contrato passam", () => {
    for (const role of [
      "globalStrategist",
      "coordinator",
      "obtLab",
      "resourceCircle",
    ]) {
      expect(readSession({ role, regionScope: null }).role).toBe(role);
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
      readSession({ role: "coordinator", regionScope: every }).regionScope,
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
            data: { role: "obtLab", regionScope: ["africa"], name: "Ana" },
          };
    await authAPI.signIn({ email: "a@b.co", password: "12345678" });
    await expect(sessionAPI.get()).resolves.toEqual({
      role: "obtLab",
      regionScope: ["africa"],
      name: "Ana",
    });
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
