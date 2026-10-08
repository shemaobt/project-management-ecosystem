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
const { AuthContext, NO_APPS } = await import("../../../../contexts/session");
const { AvaliacaoPage } = await import("..");

type AuthSession = NonNullable<Parameters<typeof AuthContext.Provider>[0]["value"]>;

const noop = async () => undefined;

/** `/formularios/avaliacao/kadiweu` typed by someone holding `roles`, before any record is read. */
function visit(roles: SessionRole[]): string {
  const value: AuthSession = {
    status: "ready",
    user: { id: "u", role: roles[0], roles, regionScope: [], name: null },
    apps: NO_APPS,
    visibleRegions: [],
    canSeeRegion: () => true,
    signIn: noop,
    signOut: noop,
    switchRole: null,
    failure: null,
  };
  return renderToStaticMarkup(
    createElement(
      MemoryRouter,
      { initialEntries: ["/formularios/avaliacao/kadiweu"] },
      createElement(
        AuthContext.Provider,
        { value },
        createElement(
          Routes,
          null,
          createElement(Route, {
            path: "formularios/avaliacao/:projectId",
            element: createElement(AvaliacaoPage),
          }),
        ),
      ),
    ),
  );
}

beforeEach(async () => {
  await i18n.changeLanguage("pt");
});

describe("a rota da Avaliação de Saúde é de quem a grava (OBT-579)", () => {
  it("o Círculo de Recursos, pela URL, não monta o questionário: a página redireciona", () => {
    const markup = visit(["resourceCircle"]);
    expect(markup).toBe("");
  });

  it("a coordenação e o OBT Lab montam a página, que começa lendo o registro", () => {
    for (const role of ["coordinator", "obtLab"] as const) {
      const markup = visit([role]);
      expect(markup, role).not.toBe("");
      expect(markup, role).toContain(i18n.t("loading"));
    }
  });
});
