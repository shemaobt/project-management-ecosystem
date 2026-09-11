import { afterEach, describe, expect, it, vi } from "vitest";
import en from "../../../i18n/locales/en.json";
import ptBR from "../../../i18n/locales/pt-BR.json";
import type { ApiFailureKind } from "../../../types/session";
import {
  FAILURE_MESSAGE_KEYS,
  UNKNOWN_VOCABULARY,
  failure,
  failureMessage,
  failureMessageKey,
  isAnnounceable,
  isApiFailure,
  isRetryable,
  toApiFailure,
} from "../errors";

const pt: Record<string, string> = ptBR;
const english: Record<string, string> = en;

const t = (key: string, params?: Record<string, unknown>) =>
  Object.entries(params ?? {}).reduce(
    (text, [name, value]) => text.replace(`{{${name}}}`, String(value)),
    pt[key] ?? key,
  );

function withResponse(status: number, data?: unknown) {
  return { code: "ERR_BAD_REQUEST", config: {}, response: { status, data } };
}

function withoutResponse(code?: string) {
  return { code, config: {}, response: undefined };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("as quatro leituras que a issue exige separadas", () => {
  it("sem resposta e sem código é queda de rede", () => {
    expect(toApiFailure(withoutResponse("ERR_NETWORK")).kind).toBe("offline");
    expect(toApiFailure(withoutResponse()).kind).toBe("offline");
  });

  it("ECONNABORTED e ETIMEDOUT são espera, não queda", () => {
    expect(toApiFailure(withoutResponse("ECONNABORTED")).kind).toBe("timeout");
    expect(toApiFailure(withoutResponse("ETIMEDOUT")).kind).toBe("timeout");
  });

  it("navegador offline ganha do código de timeout", () => {
    vi.stubGlobal("navigator", { onLine: false });
    expect(toApiFailure(withoutResponse("ECONNABORTED")).kind).toBe("offline");
  });

  it("401 é sessão, 500 é servidor", () => {
    expect(toApiFailure(withResponse(401)).kind).toBe("unauthorized");
    expect(toApiFailure(withResponse(500)).kind).toBe("server");
    expect(toApiFailure(withResponse(503)).kind).toBe("server");
  });

  it("as quatro dizem coisas diferentes nos dois catálogos", () => {
    const kinds: ApiFailureKind[] = [
      "offline",
      "timeout",
      "unauthorized",
      "server",
    ];
    for (const catalogue of [pt, english]) {
      const said = kinds.map((kind) => catalogue[FAILURE_MESSAGE_KEYS[kind]]);
      expect(new Set(said).size).toBe(kinds.length);
    }
  });
});

describe("as demais recusas do envelope do shema-api", () => {
  it("mapeia cada status que o repositório emite", () => {
    expect(toApiFailure(withResponse(400)).kind).toBe("invalid");
    expect(toApiFailure(withResponse(403)).kind).toBe("forbidden");
    expect(toApiFailure(withResponse(404)).kind).toBe("notFound");
    expect(toApiFailure(withResponse(409)).kind).toBe("conflict");
    expect(toApiFailure(withResponse(422)).kind).toBe("invalid");
  });

  it("um 4xx que ninguém previu é dado recusado, não servidor caído", () => {
    expect(toApiFailure(withResponse(429)).kind).toBe("invalid");
  });

  it("um status que não é erro nenhum é inesperado", () => {
    expect(toApiFailure(withResponse(302)).kind).toBe("unexpected");
  });

  it("lê detail e code do envelope {detail, code}", () => {
    const refused = toApiFailure(
      withResponse(409, { detail: "Someone edited it", code: "CONFLICT" }),
    );
    expect(refused).toEqual({
      kind: "conflict",
      status: 409,
      code: "CONFLICT",
      detail: "Someone edited it",
    });
  });

  it("um cancelamento é reconhecido e nunca anunciado", () => {
    const canceled = toApiFailure(withoutResponse("ERR_CANCELED"));
    expect(canceled.kind).toBe("canceled");
    expect(isAnnounceable(canceled)).toBe(false);
    expect(isAnnounceable(toApiFailure(withResponse(500)))).toBe(true);
  });

  it("o que não é erro de rede nenhum não vira erro de servidor", () => {
    expect(toApiFailure("boom").kind).toBe("unexpected");
    expect(toApiFailure(undefined).kind).toBe("unexpected");
  });

  it("classificar duas vezes devolve a mesma falha", () => {
    const once = toApiFailure(withResponse(404));
    expect(toApiFailure(once)).toBe(once);
    expect(isApiFailure(once)).toBe(true);
    expect(isApiFailure({ kind: "offline" })).toBe(false);
  });
});

describe("a frase que o coordenador lê", () => {
  it("toda leitura tem chave, e as duas metades diferem", () => {
    for (const kind of Object.keys(FAILURE_MESSAGE_KEYS) as ApiFailureKind[]) {
      const key = FAILURE_MESSAGE_KEYS[kind];
      expect(Object.keys(pt), kind).toContain(key);
      expect(Object.keys(english), kind).toContain(key);
      expect(english[key], kind).not.toBe(pt[key]);
    }
  });

  it("a frase do servidor ganha só onde ele sabe mais que nós", () => {
    const detail = "O id kadiweu já existe.";
    expect(failureMessage(toApiFailure(withResponse(400, { detail })), t)).toBe(
      detail,
    );
    expect(failureMessage(toApiFailure(withResponse(409, { detail })), t)).toBe(
      detail,
    );
    expect(failureMessage(toApiFailure(withResponse(404, { detail })), t)).toBe(
      detail,
    );
  });

  it("e nunca onde ele não sabe nada de útil", () => {
    const detail = "Internal Server Error";
    expect(failureMessage(toApiFailure(withResponse(500, { detail })), t)).toBe(
      t("net_server", { status: 500 }),
    );
    expect(failureMessage(toApiFailure(withResponse(401, { detail })), t)).toBe(
      pt.net_expired,
    );
    expect(failureMessage(toApiFailure(withResponse(403, { detail })), t)).toBe(
      pt.net_forbidden,
    );
  });

  it("o erro de servidor nomeia o status para quem for investigar", () => {
    const said = failureMessage(toApiFailure(withResponse(502)), t);
    expect(said).toContain("502");
    expect(said).not.toContain("{{status}}");
  });

  it("uma falha sem status não deixa o buraco do status visível", () => {
    expect(failureMessage(failure("offline"), t)).toBe(pt.net_offline);
    expect(failureMessage(failure("timeout"), t)).not.toContain("{{");
  });

  it("esperar e tentar de novo resolve offline, timeout, servidor e conflito", () => {
    for (const kind of ["offline", "timeout", "server", "conflict"] as const) {
      expect(isRetryable(failure(kind)), kind).toBe(true);
    }
    for (const kind of ["unauthorized", "forbidden", "invalid"] as const) {
      expect(isRetryable(failure(kind)), kind).toBe(false);
    }
  });

  it("a recusa do próprio painel se identifica por código", () => {
    const refused = failure("invalid", null, UNKNOWN_VOCABULARY);
    expect(refused.code).toBe(UNKNOWN_VOCABULARY);
    expect(failureMessageKey(refused)).toBe("net_invalid");
  });
});
