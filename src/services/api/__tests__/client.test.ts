import axios, { type InternalAxiosRequestConfig } from "axios";
import { beforeEach, describe, expect, it } from "vitest";
import { API_BASE_URL, http } from "../client";
import { toApiFailure } from "../errors";
import {
  accessToken,
  forgetTokens,
  onSessionEvent,
  setTokens,
  type SessionEvent,
} from "../tokens";

interface Call {
  url: string;
  authorization: string | null;
  body: unknown;
}

type Reply = { status: number; data?: unknown } | { networkCode: string };

const calls: Call[] = [];

let script: (call: Call, attempt: number) => Reply;

const attempts = new Map<string, number>();

function record(config: InternalAxiosRequestConfig): Call {
  const header = config.headers?.Authorization;
  return {
    url: `${config.url ?? ""}`,
    authorization: typeof header === "string" ? header : null,
    body:
      typeof config.data === "string"
        ? (JSON.parse(config.data) as unknown)
        : config.data,
  };
}

const adapter = async (config: InternalAxiosRequestConfig) => {
  const call = record(config);
  calls.push(call);
  const attempt = (attempts.get(call.url) ?? 0) + 1;
  attempts.set(call.url, attempt);

  const reply = script(call, attempt);
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

beforeEach(() => {
  calls.length = 0;
  attempts.clear();
  forgetTokens("signedOut");
  script = () => ({ status: 200, data: { ok: true } });
});

describe("a instância única", () => {
  it("aponta para o prefixo /api que o proxy do Vite atende", () => {
    expect(API_BASE_URL).toBe("/api");
    expect(http.defaults.baseURL).toBe("/api");
  });

  it("tem prazo: uma conexão de campo é lenta, não eterna", () => {
    expect(http.defaults.timeout).toBeGreaterThan(0);
  });

  it("não manda Authorization quando não há sessão", async () => {
    await http.get("/shema/projects");
    expect(calls[0].authorization).toBeNull();
  });

  it("manda o bearer da sessão em cada chamada", async () => {
    setTokens({ accessToken: "access-1", refreshToken: "refresh-1" });
    await http.get("/shema/projects");
    expect(calls[0].authorization).toBe("Bearer access-1");
  });
});

describe("um 401 tenta o refresh uma vez e repete a chamada", () => {
  it("repete com o token novo e devolve o corpo", async () => {
    setTokens({ accessToken: "stale", refreshToken: "refresh-1" });
    script = (call, attempt) => {
      if (call.url.includes("/auth/refresh")) {
        return { status: 200, data: { access_token: "fresh" } };
      }
      return attempt === 1
        ? { status: 401, data: { detail: "expired", code: "UNAUTHORIZED" } }
        : { status: 200, data: { served: true } };
    };

    const response = await http.get<{ served: boolean }>("/shema/projects");

    expect(response.data.served).toBe(true);
    expect(calls.map((call) => call.url)).toEqual([
      "/shema/projects",
      `${API_BASE_URL}/auth/refresh`,
      "/shema/projects",
    ]);
    expect(calls[2].authorization).toBe("Bearer fresh");
    expect(accessToken()).toBe("fresh");
  });

  it("o refresh manda o token de refresh no corpo, como a plataforma espera", async () => {
    setTokens({ accessToken: "stale", refreshToken: "refresh-1" });
    script = (call, attempt) =>
      call.url.includes("/auth/refresh")
        ? { status: 200, data: { access_token: "fresh" } }
        : attempt === 1
          ? { status: 401 }
          : { status: 200 };

    await http.get("/shema/projects");
    expect(calls[1].body).toEqual({ refresh_token: "refresh-1" });
  });

  it("dois 401 ao mesmo tempo fazem um refresh só", async () => {
    setTokens({ accessToken: "stale", refreshToken: "refresh-1" });
    script = (call, attempt) => {
      if (call.url.includes("/auth/refresh")) {
        return { status: 200, data: { access_token: "fresh" } };
      }
      return attempt === 1 ? { status: 401 } : { status: 200 };
    };

    await Promise.all([
      http.get("/shema/projects"),
      http.get("/shema/regions"),
      http.get("/shema/meetings"),
    ]);

    const refreshes = calls.filter((call) =>
      call.url.includes("/auth/refresh"),
    );
    expect(refreshes).toHaveLength(1);
  });

  it("não repete duas vezes: o segundo 401 é recusa, não laço", async () => {
    setTokens({ accessToken: "stale", refreshToken: "refresh-1" });
    script = (call) =>
      call.url.includes("/auth/refresh")
        ? { status: 200, data: { access_token: "fresh" } }
        : { status: 401 };

    await expect(http.get("/shema/projects")).rejects.toMatchObject({
      kind: "unauthorized",
    });
    expect(calls.filter((call) => call.url === "/shema/projects")).toHaveLength(
      2,
    );
  });
});

describe("quando o refresh também falha", () => {
  it("esquece os tokens e avisa que a sessão expirou", async () => {
    const seen: SessionEvent[] = [];
    const stop = onSessionEvent((event) => seen.push(event));
    setTokens({ accessToken: "stale", refreshToken: "refresh-1" });
    script = (call) =>
      call.url.includes("/auth/refresh") ? { status: 401 } : { status: 401 };

    await expect(http.get("/shema/projects")).rejects.toMatchObject({
      kind: "unauthorized",
    });

    expect(seen).toEqual(["signedIn", "expired"]);
    expect(accessToken()).toBeNull();
    stop();
  });

  it("uma queda de rede no refresh não é lida como credencial errada", async () => {
    setTokens({ accessToken: "stale", refreshToken: "refresh-1" });
    script = (call) =>
      call.url.includes("/auth/refresh")
        ? { networkCode: "ERR_NETWORK" }
        : { status: 401 };

    await expect(http.get("/shema/projects")).rejects.toMatchObject({
      kind: "unauthorized",
    });
    expect(accessToken()).toBeNull();
  });
});

describe("as rotas de autenticação nunca entram no refresh", () => {
  it("e um id de projeto que contenha o nome de uma delas não engana o guarda", async () => {
    setTokens({ accessToken: "stale", refreshToken: "refresh-1" });
    script = (call, attempt) => {
      if (call.url.includes("/auth/refresh")) {
        return { status: 200, data: { access_token: "fresh" } };
      }
      return attempt === 1 ? { status: 401 } : { status: 200 };
    };

    await http.get("/shema/projects/auth/login");
    expect(calls.some((call) => call.url.includes("/auth/refresh"))).toBe(true);
  });

  it("um 401 no login é credencial recusada e nada mais acontece", async () => {
    script = () => ({ status: 401, data: { detail: "Invalid credentials" } });

    await expect(
      http.post("/auth/login", { email: "a@b.c", password: "12345678" }),
    ).rejects.toMatchObject({ kind: "unauthorized" });

    expect(calls.map((call) => call.url)).toEqual(["/auth/login"]);
  });
});

describe("a falha que chega ao chamador já está classificada", () => {
  it("uma queda de rede vira offline sem passar por toApiFailure de novo", async () => {
    script = () => ({ networkCode: "ERR_NETWORK" });
    const caught = await http
      .get("/shema/projects")
      .catch((error: unknown) => error);
    expect(toApiFailure(caught)).toBe(caught);
    expect(caught).toMatchObject({ kind: "offline", status: null });
  });

  it("um 500 carrega status, código e a frase do servidor", async () => {
    script = () => ({
      status: 500,
      data: { detail: "boom", code: "INTERNAL_ERROR" },
    });
    await expect(http.get("/shema/projects")).rejects.toEqual({
      kind: "server",
      status: 500,
      code: "INTERNAL_ERROR",
      detail: "boom",
    });
  });
});
