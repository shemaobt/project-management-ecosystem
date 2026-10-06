import { readFileSync } from "node:fs";
import { join } from "node:path";
import { AxiosError } from "axios";
import { createElement, type ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PasswordAPI } from "../../../../services/api";

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

const { post } = vi.hoisted(() => ({ post: vi.fn() }));
vi.mock("axios", async (importOriginal) => {
  const actual = await importOriginal<typeof import("axios")>();
  return { ...actual, default: { ...actual.default, post } };
});

const { default: i18n } = await import("../../../../i18n");
const { passwordAPI } = await import("../../../../services/api/endpoints");
const { EsqueciPage } = await import("../EsqueciPage");
const { RedefinirPage } = await import("../RedefinirPage");
const { SenhaNotice } = await import("../SenhaNotice");
const {
  PASSWORD_MAX,
  PASSWORD_MIN,
  mismatched,
  outOfBounds,
  ready,
  readToken,
  resetRefusal,
} = await import("../newPassword");

beforeEach(async () => {
  await i18n.changeLanguage("pt");
  post.mockReset();
});

const t = (key: string, params?: Record<string, unknown>) => i18n.t(key, params ?? {});

const NEVER_CALLED: PasswordAPI = {
  forgot: () => Promise.reject(new Error("a tela não devia chamar o serviço ao renderizar")),
  reset: () => Promise.reject(new Error("a tela não devia chamar o serviço ao renderizar")),
};

const render = (element: ReactElement, at = "/") =>
  renderToStaticMarkup(
    createElement(MemoryRouter, { initialEntries: [at] }, element),
  );

const source = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

function refusedBy(status: number): AxiosError {
  return new AxiosError("refused", "ERR_BAD_REQUEST", undefined, undefined, {
    status,
    statusText: "",
    headers: {},
    config: { headers: {} } as never,
    data: { detail: "Invalid or expired reset link. Please request a new one." },
  });
}

describe("as rotas no App", () => {
  const app = source("src/App.tsx");
  const gate = app.indexOf("<SessionGate>");
  const forgot = app.indexOf('path="forgot-password"');
  const reset = app.indexOf('path="reset-password"');
  const intake = app.indexOf('path="intake/:token"');

  it("/forgot-password e /reset-password ficam fora do gate — quem chega não tem sessão", () => {
    expect(gate).toBeGreaterThan(-1);
    expect(forgot).toBeGreaterThan(-1);
    expect(reset).toBeGreaterThan(-1);
    expect(forgot).toBeLessThan(gate);
    expect(reset).toBeLessThan(gate);
    expect(forgot).toBeLessThan(intake);
    expect(reset).toBeLessThan(intake);
  });

  it("as duas só existem com a API — em fixtures seriam botões mortos", () => {
    expect(app.slice(forgot - 60, forgot)).toContain("passwordAPI ? (");
    expect(app.slice(reset - 60, reset)).toContain("passwordAPI ? (");
    expect(app).toContain("<EsqueciPage api={passwordAPI} />");
    expect(app).toContain("<RedefinirPage api={passwordAPI} />");
  });

  it("o caminho do e-mail do servidor é o da rota: /reset-password?token=", () => {
    expect(app).toContain('path="reset-password"');
    expect(source("src/components/pages/senha/RedefinirPage.tsx")).toContain(
      'params.get("token")',
    );
  });
});

describe("a tela de entrada leva ao esqueci a senha", () => {
  it("o link usa o mesmo critério que as rotas — sem API, link nenhum", () => {
    const entrar = source("src/components/pages/entrar/index.tsx");
    expect(entrar).toContain('to="/forgot-password"');
    expect(entrar).toContain("passwordAPI ? (");
    expect(entrar).toContain('t("senha_forgot_link")');
  });

  it("o diálogo de sessão expirada não leva para fora do trabalho montado", () => {
    expect(source("src/components/pages/entrar/SessionExpired.tsx")).not.toContain(
      "forgot-password",
    );
  });
});

describe("o serviço, em axios cru", () => {
  it("o esqueci responde o mesmo para qualquer endereço, e a resposta não carrega nada", async () => {
    post.mockResolvedValue({ data: { message: "If an account exists, a reset link has been sent." } });
    const known = await passwordAPI.forgot("admin@shema.org");
    const unknown = await passwordAPI.forgot("ninguem@exemplo.org");
    expect(known).toEqual({ ok: true });
    expect(unknown).toEqual(known);
    expect(Object.keys(known)).toEqual(["ok"]);
  });

  it("manda o app_key do PME, para o link do e-mail apontar para cá", async () => {
    post.mockResolvedValue({ data: {} });
    await passwordAPI.forgot("alguem@shema.org");
    expect(post).toHaveBeenCalledTimes(1);
    const [url, body] = post.mock.calls[0] as [string, Record<string, unknown>];
    expect(url).toMatch(/\/auth\/forgot-password$/u);
    expect(body).toEqual({ email: "alguem@shema.org", app_key: "shema" });
  });

  it("o reset vai pelo axios cru, nunca pelo http com o interceptor de 401", async () => {
    post.mockResolvedValue({ data: {} });
    await passwordAPI.reset("tok", "umasenhalonga");
    const [url, body, options] = post.mock.calls[0] as [string, unknown, { headers: unknown }];
    expect(url).toMatch(/\/auth\/reset-password$/u);
    expect(body).toEqual({ token: "tok", password: "umasenhalonga" });
    expect(options.headers).toEqual({ Accept: "application/json" });
    const endpoints = source("src/services/api/endpoints.ts");
    const block = endpoints.slice(endpoints.indexOf("export const passwordAPI"));
    expect(block).not.toContain("http.post");
  });

  it("um token recusado é o 401 do servidor, lido como recusa e não como sessão", async () => {
    post.mockRejectedValue(refusedBy(401));
    const outcome = await passwordAPI.reset("velho", "umasenhalonga");
    expect(outcome.ok).toBe(false);
    if (outcome.ok) return;
    expect(outcome.failure.kind).toBe("unauthorized");
    expect(resetRefusal(outcome.failure.kind)).toBe("refused");
  });

  it("qualquer outra falha é rede: o formulário fica e o alerta diz o que houve", () => {
    for (const kind of ["offline", "timeout", "server", "invalid", "unexpected"]) {
      expect(resetRefusal(kind), kind).toBe("network");
    }
  });
});

describe("a confirmação do esqueci não diz se o e-mail existe", () => {
  it("as duas frases não interpolam nada — não há onde pôr o endereço", () => {
    for (const key of ["senha_sent_title", "senha_sent_body"]) {
      expect(t(key), key).not.toContain("{{");
      expect(i18n.getResource("en", "translation", key), key).not.toContain("{{");
    }
  });

  it("a tela só lê outcome.ok — a resposta do serviço não tem outro campo", () => {
    const page = source("src/components/pages/senha/EsqueciPage.tsx");
    expect(page).toContain("if (outcome.ok) setSent(true)");
    const read = new Set(page.match(/outcome\.\w+/gu));
    expect([...read].sort()).toEqual(["outcome.failure", "outcome.ok"]);
  });

  it("a confirmação substitui o formulário: título, frase e o caminho de volta", () => {
    const html = render(
      createElement(SenhaNotice, {
        titleKey: "senha_sent_title",
        bodyKey: "senha_sent_body",
        to: "/",
        linkKey: "senha_back_to_login",
      }),
    );
    expect(html).toContain(t("senha_sent_title"));
    expect(html).toContain(t("senha_sent_body"));
    expect(html).toContain('href="/"');
    expect(html).not.toContain("<form");
    expect(html).not.toContain("<input");
  });
});

describe("a tela do esqueci", () => {
  it("pede só o e-mail, com rótulo, e o botão pronto", () => {
    const html = render(createElement(EsqueciPage, { api: NEVER_CALLED }));
    expect(html).toContain(t("senha_forgot_title"));
    expect(html).toContain(t("senha_forgot_lead"));
    expect(html).toContain(t("entrar_email"));
    expect(html).toContain('type="email"');
    expect(html).not.toContain('type="password"');
    expect(html).toContain(t("senha_forgot_submit"));
    expect(html).not.toContain("disabled=");
    expect((html.match(/<label/gu) ?? []).length).toBe(1);
  });

  it("volta para entrar sem precisar de sessão", () => {
    const html = render(createElement(EsqueciPage, { api: NEVER_CALLED }));
    expect(html).toContain('href="/"');
    expect(html).toContain(t("senha_back_to_login"));
  });
});

describe("a tela de redefinir sem token", () => {
  it("sem ?token= mostra a recusa, nunca um campo de senha", () => {
    const html = render(createElement(RedefinirPage, { api: NEVER_CALLED }), "/reset-password");
    expect(html).toContain(t("senha_missing_title"));
    expect(html).toContain(t("senha_missing_body"));
    expect(html).not.toContain('type="password"');
    expect(html).not.toContain("<form");
    expect(html).toContain('href="/forgot-password"');
    expect(html).toContain(t("senha_ask_again"));
  });

  it("token em branco conta como ausente", () => {
    for (const at of ["/reset-password?token=", "/reset-password?token=%20"]) {
      const html = render(createElement(RedefinirPage, { api: NEVER_CALLED }), at);
      expect(html, at).toContain(t("senha_missing_title"));
      expect(html, at).not.toContain('type="password"');
    }
    expect(readToken(null)).toBeNull();
    expect(readToken("")).toBeNull();
    expect(readToken("  ")).toBeNull();
    expect(readToken(" abc ")).toBe("abc");
  });

  it("o token recusado tem frase própria, sem campo de senha, e leva ao esqueci", () => {
    const html = render(
      createElement(SenhaNotice, {
        titleKey: "senha_refused_title",
        bodyKey: "senha_refused_body",
        to: "/forgot-password",
        linkKey: "senha_ask_again",
      }),
    );
    expect(html).toContain(t("senha_refused_title"));
    expect(html).not.toContain('type="password"');
    expect(html).toContain('href="/forgot-password"');
    expect(t("senha_refused_title")).not.toBe(t("senha_missing_title"));
    const page = source("src/components/pages/senha/RedefinirPage.tsx");
    expect(page).toContain('setPhase("refused")');
    expect(page).toContain('phase === "missing" ? "senha_missing_title" : "senha_refused_title"');
  });
});

describe("a tela de redefinir com token", () => {
  it("pede a senha duas vezes, com os limites ditos antes da viagem, e o botão fechado até valer", () => {
    const html = render(
      createElement(RedefinirPage, { api: NEVER_CALLED }),
      "/reset-password?token=abc",
    );
    expect(html).toContain(t("senha_reset_title"));
    expect((html.match(/type="password"/gu) ?? []).length).toBe(2);
    expect(html.toLowerCase()).toContain('autocomplete="new-password"');
    expect(html).toContain(t("senha_bounds", { min: PASSWORD_MIN, max: PASSWORD_MAX }));
    expect(html).toContain("disabled=");
    expect((html.match(/<label/gu) ?? []).length).toBe(2);
  });
});

describe("as regras da senha nova", () => {
  it("os limites são os do ResetPasswordRequest do shema-api, e o piso é o do /convite", () => {
    expect(PASSWORD_MIN).toBe(8);
    expect(PASSWORD_MAX).toBe(128);
  });

  it("fora dos limites só depois de começar a digitar", () => {
    expect(outOfBounds("")).toBe(false);
    expect(outOfBounds("curta")).toBe(true);
    expect(outOfBounds("x".repeat(8))).toBe(false);
    expect(outOfBounds("x".repeat(128))).toBe(false);
    expect(outOfBounds("x".repeat(129))).toBe(true);
  });

  it("a confirmação vazia ainda não é divergência", () => {
    expect(mismatched("umasenhalonga", "")).toBe(false);
    expect(mismatched("umasenhalonga", "umasenhalong")).toBe(true);
    expect(mismatched("umasenhalonga", "umasenhalonga")).toBe(false);
  });

  it("pronto só com as duas iguais e dentro dos limites", () => {
    expect(ready("umasenhalonga", "umasenhalonga")).toBe(true);
    expect(ready("curta", "curta")).toBe(false);
    expect(ready("umasenhalonga", "")).toBe(false);
  });
});

describe("em inglês não sobra português", () => {
  it("nas duas telas e nos avisos", async () => {
    await i18n.changeLanguage("en");
    const screens = [
      render(createElement(EsqueciPage, { api: NEVER_CALLED })),
      render(createElement(RedefinirPage, { api: NEVER_CALLED }), "/reset-password"),
      render(createElement(RedefinirPage, { api: NEVER_CALLED }), "/reset-password?token=abc"),
    ];
    for (const html of screens) {
      expect(html).not.toContain("senha");
      expect(html).not.toContain("Esqueci");
      expect(html).not.toContain("Voltar");
    }
    expect(screens[0]).toContain(i18n.t("senha_forgot_title"));
    expect(screens[1]).toContain(i18n.t("senha_missing_title"));
    expect(screens[2]).toContain(i18n.t("senha_reset_title"));
    await i18n.changeLanguage("pt");
  });
});
