import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SessionRole } from "../../../../types/session";

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
const { SESSION_ROLES } = await import("../../../../constants/roles");
const { AuthContext } = await import("../../../../contexts/session");
const { AcessoPage } = await import("../index");
const { STUB_API, sessionFor } = await import("./stubs");

beforeEach(async () => {
  await i18n.changeLanguage("pt");
});

function visit(roles: SessionRole[]): string {
  return renderToStaticMarkup(
    createElement(
      MemoryRouter,
      { initialEntries: ["/acesso"] },
      createElement(
        AuthContext.Provider,
        { value: sessionFor(roles) },
        createElement(
          Routes,
          null,
          createElement(Route, {
            path: "acesso",
            element: createElement(AcessoPage, { api: STUB_API }),
          }),
        ),
      ),
    ),
  );
}

const SCREEN = () => i18n.t("acesso_search_label");
const DENIED = () => i18n.t("acesso_denied_title");

describe("só o admin abre /acesso", () => {
  it("cada um dos outros seis papéis recebe a página de não autorizado, e nada da tela", () => {
    const others = SESSION_ROLES.filter((role) => role !== "admin");
    expect(others).toHaveLength(6);
    for (const role of others) {
      const out = visit([role]);
      expect(out, role).toContain(DENIED());
      expect(out, role).not.toContain(SCREEN());
    }
  });

  it("o admin recebe a tela", () => {
    const out = visit(["admin"]);
    expect(out).toContain(SCREEN());
    expect(out).toContain(i18n.t("acesso_invites_title"));
    expect(out).toContain(i18n.t("acesso_history_title"));
    expect(out).not.toContain(DENIED());
  });

  it("a Admin de hoje — role gestor, admin na lista — também: a guarda lê roles, não role", () => {
    const out = visit(["gestor", "admin"]);
    expect(out).toContain(SCREEN());
  });

  it("uma sessão sem papel nenhum não passa", () => {
    expect(visit([])).toContain(DENIED());
  });
});

describe("as rotas no App", () => {
  const app = readFileSync(join(process.cwd(), "src/App.tsx"), "utf8");
  const gate = app.indexOf("<SessionGate>");
  const shell = app.indexOf("<Route element={<AppShell />}>");
  const acesso = app.indexOf('path="acesso"');
  const convite = app.indexOf('path="convite"');
  const intake = app.indexOf('path="intake/:token"');

  it("/acesso fica dentro do gate e do shell, e só existe com a API de acesso", () => {
    expect(gate).toBeGreaterThan(-1);
    expect(acesso).toBeGreaterThan(shell);
    expect(shell).toBeGreaterThan(gate);
    expect(app.slice(acesso - 160, acesso)).toContain("accessAPI ? (");
    expect(app).toContain("<AcessoPage api={accessAPI} />");
  });

  it("/convite fica fora do gate — quem chega não tem sessão — e acima do intake", () => {
    expect(convite).toBeGreaterThan(-1);
    expect(convite).toBeLessThan(gate);
    expect(convite).toBeLessThan(intake);
    expect(app.slice(convite - 80, convite)).toContain("accessAPI ? (");
  });

  it("o link do cabeçalho usa o mesmo critério que a guarda — link morto nenhum", () => {
    const header = readFileSync(
      join(process.cwd(), "src/components/layout/AppHeader.tsx"),
      "utf8",
    );
    const page = readFileSync(
      join(process.cwd(), "src/components/pages/acesso/index.tsx"),
      "utf8",
    );
    expect(header).toContain("accessAPI && canAdministerAccess(user)");
    expect(header).toContain('to="/acesso"');
    expect(page).toContain("canAdministerAccess(user)");
  });
});
