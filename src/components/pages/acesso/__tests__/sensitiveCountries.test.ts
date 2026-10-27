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
const { SensitiveCountriesEditor } = await import("../SensitiveCountriesSection");
const { listOfRows, rowsOf, sameList } = await import("../sensitiveList");
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

const LISTED = [
  { name: "Irã", spellings: ["Iran", "Irão"] },
  { name: "Índia", spellings: ["India"] },
];

describe("a lista de países sensíveis é do Admin, em /acesso", () => {
  it("o Admin vê a seção da lista", () => {
    const out = visit(["admin"]);

    expect(out).toContain(i18n.t("acesso_sensitive_title"));
    expect(out).toContain('id="paises-sensiveis"');
  });

  it("quem não é Admin não chega à lista", () => {
    for (const role of SESSION_ROLES.filter((r) => r !== "admin")) {
      expect(visit([role]), role).not.toContain(i18n.t("acesso_sensitive_title"));
    }
  });

  it("o editor mostra cada país com as outras grafias, e salvar sem mudança não é oferecido", () => {
    const out = renderToStaticMarkup(
      createElement(SensitiveCountriesEditor, {
        saved: LISTED,
        working: false,
        refusal: null,
        done: false,
        onSave: () => {},
      }),
    );

    expect(out).toContain('value="Irã"');
    expect(out).toContain('value="Iran, Irão"');
    expect(out).toContain(i18n.t("acesso_sensitive_remove", { name: "Índia" }));
    expect(out).toMatch(/<button[^>]*type="submit"[^>]*disabled=""/);
  });
});

describe("o que a lista manda ao servidor", () => {
  it("o Admin salva a lista inteira, sem grafias em branco nem linhas vazias", () => {
    const rows = [
      ...rowsOf(LISTED),
      { key: "a", name: "  Síria ", spellings: "Syria, , Syria ,Siria" },
      { key: "b", name: "   ", spellings: " , " },
    ];

    expect(listOfRows(rows)).toEqual([
      { name: "Irã", spellings: ["Iran", "Irão"] },
      { name: "Índia", spellings: ["India"] },
      { name: "Síria", spellings: ["Syria", "Siria"] },
    ]);
  });

  it("apagar o nome de um país não o tira da lista calado: a linha vai e o servidor recusa", () => {
    const [, india] = rowsOf(LISTED);

    expect(listOfRows([{ ...india, name: "  " }])).toEqual([
      { name: "", spellings: ["India"] },
    ]);
  });

  it("a lista como foi lida não é uma mudança; um país a menos é", () => {
    expect(sameList(rowsOf(LISTED), LISTED)).toBe(true);
    expect(sameList(rowsOf(LISTED.slice(1)), LISTED)).toBe(false);
  });
});
