import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ApiFailure, ApiFailureKind } from "../../../../types/session";

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
  };
}

const storage = createMemoryStorage();
vi.stubGlobal("localStorage", storage);
vi.stubGlobal("window", { localStorage: storage });

const { default: i18n } = await import("../../../../i18n");
const { UNKNOWN_VOCABULARY } = await import("../../../../services/api");
const { AuthContext } = await import("../../../../contexts/session");
const { EntrarView } = await import("../index");
const { CredentialsForm } = await import("../CredentialsForm");
const { signInMessage } = await import("../message");
const { SessionGate } = await import("../../../layout/SessionGate");
const { keepsWorkMounted, sessionSurface } = await import(
  "../../../layout/sessionSurface"
);

type AuthSession = Parameters<typeof AuthContext.Provider>[0]["value"];

const failure = (
  kind: ApiFailureKind,
  code: string | null = null,
): ApiFailure => ({
  kind,
  status: null,
  code,
  detail: null,
});

const noop = async () => undefined;

const session = (over: Partial<NonNullable<AuthSession>>): AuthSession => ({
  status: "ready",
  user: { id: "u", role: "coordinator", regionScope: [], name: null },
  visibleRegions: [],
  canSeeRegion: () => false,
  signIn: noop,
  signOut: noop,
  switchRole: null,
  failure: null,
  ...over,
});

const WORK = "o-que-estava-sendo-preenchido";

function gate(value: AuthSession): string {
  return renderToStaticMarkup(
    createElement(
      AuthContext.Provider,
      { value },
      createElement(SessionGate, null, WORK as ReactNode),
    ),
  );
}

beforeEach(async () => {
  await i18n.changeLanguage("pt");
});

describe("a tela de entrada", () => {
  const markup = (over: Partial<Parameters<typeof EntrarView>[0]> = {}) =>
    renderToStaticMarkup(
      createElement(EntrarView, { onSubmit: noop, failure: null, ...over }),
    );

  it("diz o que é e o que a pessoa precisa ter", () => {
    const html = markup();
    expect(html).toContain(i18n.t("entrar_title"));
    expect(html).toContain(i18n.t("entrar_lead"));
    expect(html).toContain(i18n.t("entrar_email"));
    expect(html).toContain(i18n.t("entrar_password"));
    expect(html).toContain(i18n.t("entrar_submit"));
  });

  it("avisa que a sessão não sobrevive a um recarregamento, e por quê", () => {
    expect(markup()).toContain(i18n.t("entrar_session_note"));
  });

  it("os dois campos são rotulados e a senha nunca é texto puro", () => {
    const html = markup();
    expect(html).toContain('type="password"');
    expect(html.toLowerCase()).toContain('autocomplete="current-password"');
    expect((html.match(/<label/gu) ?? []).length).toBe(2);
  });

  it("mostra a recusa num alerta, não num toast que some", () => {
    const html = markup({ failure: failure("unauthorized") });
    expect(html).toContain('role="alert"');
    expect(html).toContain(i18n.t("entrar_bad_credentials"));
  });

  it("não sobra português quando a língua é EN", async () => {
    await i18n.changeLanguage("en");
    const html = markup();
    expect(html).toContain(i18n.t("entrar_title"));
    expect(html).not.toContain("Entrar no Shemá");
    await i18n.changeLanguage("pt");
  });
});

describe("a leitura da recusa na entrada", () => {
  const t = (key: string, params?: Record<string, unknown>) =>
    i18n.t(key, params ?? {});

  it("401 no login é senha errada, nunca sessão expirada", () => {
    expect(signInMessage(failure("unauthorized"), t)).toBe(
      i18n.t("entrar_bad_credentials"),
    );
    expect(signInMessage(failure("unauthorized"), t)).not.toBe(
      i18n.t("net_expired"),
    );
  });

  it("403 diz a quem pedir o papel e a região", () => {
    expect(signInMessage(failure("forbidden"), t)).toBe(
      i18n.t("entrar_no_role"),
    );
  });

  it("vocabulário desconhecido diz que o painel está atrás da API", () => {
    expect(signInMessage(failure("invalid", UNKNOWN_VOCABULARY), t)).toBe(
      i18n.t("entrar_unknown_vocabulary"),
    );
  });

  it("o resto continua com a frase da falha de rede", () => {
    expect(signInMessage(failure("offline"), t)).toBe(i18n.t("net_offline"));
    expect(signInMessage(failure("timeout"), t)).toBe(i18n.t("net_timeout"));
  });
});

describe("o formulário reclama antes de mandar", () => {
  it("os dois campos vêm vazios e o botão está pronto", () => {
    const html = renderToStaticMarkup(
      createElement(CredentialsForm, { onSubmit: noop, failure: null }),
    );
    expect(html).toContain(i18n.t("entrar_submit"));
    expect(html).not.toContain("disabled=");
  });
});

describe("o gate escolhe a superfície", () => {
  it("sessão mockada nunca vê tela de entrada", () => {
    for (const status of [
      "loading",
      "anonymous",
      "ready",
      "expired",
    ] as const) {
      expect(sessionSurface(status, false), status).toBe("app");
    }
  });

  it("sessão real: cada estado tem uma superfície, e só uma", () => {
    expect(sessionSurface("anonymous", true)).toBe("signIn");
    expect(sessionSurface("loading", true)).toBe("loading");
    expect(sessionSurface("ready", true)).toBe("app");
    expect(sessionSurface("expired", true)).toBe("reauth");
  });

  it("expirar mantém o trabalho montado; pedir senha do zero não", () => {
    expect(keepsWorkMounted("reauth")).toBe(true);
    expect(keepsWorkMounted("app")).toBe(true);
    expect(keepsWorkMounted("signIn")).toBe(false);
    expect(keepsWorkMounted("loading")).toBe(false);
  });
});

describe("o gate, renderizado", () => {
  it("com sessão mockada entrega o app inteiro e nenhuma tela de entrada", () => {
    const html = gate(
      session({ signIn: null, signOut: null, status: "loading" }),
    );
    expect(html).toContain(WORK);
    expect(html).not.toContain(i18n.t("entrar_title"));
  });

  it("anônimo troca o app pela entrada", () => {
    const html = gate(session({ status: "anonymous" }));
    expect(html).not.toContain(WORK);
    expect(html).toContain(i18n.t("entrar_title"));
  });

  it("expirado NÃO desmonta a tela: o trabalho continua renderizado", () => {
    const html = gate(session({ status: "expired" }));
    expect(html).toContain(WORK);
  });

  it("pronto entrega a tela sem nada por cima", () => {
    expect(gate(session({ status: "ready" }))).toContain(WORK);
  });
});
