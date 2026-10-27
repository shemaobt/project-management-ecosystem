import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SessionRole } from "../../../../types/session";

vi.mock("../../../../hooks/useProjectListRead", () => ({ useProjectListRead: vi.fn() }));

/**
 * The project list is the Shemá browse, behind the app's door (OBT-642): an account holding no
 * Shemá grant — a project team member — would only meet a 403 for it, and the access alert with a
 * retry that changes nothing. Its Início asks for nothing and says what it opens here instead.
 */
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
const { useProjectListRead } = await import("../../../../hooks/useProjectListRead");
const { AuthContext } = await import("../../../../contexts/session");
const { sessionFor } = await import("../../acesso/__tests__/stubs");
const { InicioPage } = await import("../index");

const reads = vi.mocked(useProjectListRead);

function visit(roles: SessionRole[]): string {
  return renderToStaticMarkup(
    createElement(
      MemoryRouter,
      null,
      createElement(
        AuthContext.Provider,
        { value: sessionFor(roles) },
        createElement(InicioPage),
      ),
    ),
  );
}

const note = () => i18n.t("inicio_shema_only", { bell: i18n.t("notif_bell") });

const countOf = (markup: string, needle: string): number =>
  markup.split(needle).length - 1;

const TEAM_ONLY: SessionRole[][] = [["equipe"], ["mesa", "equipe"], ["gestor", "equipe"]];

const SHEMA_GRANTED: SessionRole[][] = [
  ["coordinator"],
  ["obtLab"],
  ["resourceCircle"],
  ["admin", "gestor"],
  ["coordinator", "equipe"],
];

beforeEach(async () => {
  reads.mockClear();
  await i18n.changeLanguage("pt");
});

describe("o Início da conta sem papel no Shemá (OBT-642)", () => {
  it.each(TEAM_ONLY.map((roles) => [roles]))(
    "a conta só-equipe abre o Início sem pedir a lista de projetos (%j)",
    (roles) => {
      visit(roles);
      expect(reads).not.toHaveBeenCalled();
    },
  );

  it.each(SHEMA_GRANTED.map((roles) => [roles]))(
    "quem tem papel no Shemá pede a lista ao abrir o Início (%j)",
    (roles) => {
      visit(roles);
      expect(reads).toHaveBeenCalledTimes(1);
    },
  );

  it("a conta sem papel lê o que abre aqui numa nota, sem o alerta de acesso e sem tentar de novo", () => {
    const markup = visit(["equipe"]);

    expect(markup).toContain(note());
    expect(note()).toContain(i18n.t("notif_bell"));
    expect(markup).not.toContain(i18n.t("net_forbidden"));
    expect(markup).not.toContain('role="alert"');
    expect(markup).not.toContain(i18n.t("net_retry"));
  });

  it("sem faixa nem globo, que são a lista; a saudação fica, com um só h1 e sem pular nível", () => {
    const markup = visit(["equipe"]);

    expect(markup).toContain(i18n.t("headline_eyebrow"));
    expect(markup).not.toContain('href="/projetos');
    expect(markup).not.toContain(i18n.t("atlas_stat_languages"));
    expect(markup).not.toContain(i18n.t("loading"));
    expect(countOf(markup, "<h1")).toBe(1);
    expect(markup).not.toMatch(/<h[3-6]\b/u);
  });

  it("a nota é só da conta sem papel: a coordenação vê a faixa", () => {
    const markup = visit(["coordinator"]);

    expect(markup).not.toContain(note());
    expect(markup).toContain('href="/projetos');
    expect(countOf(markup, "—")).toBe(6);
  });

  it("a nota acompanha o idioma ativo", async () => {
    await i18n.changeLanguage("en");
    const markup = visit(["equipe"]);

    expect(markup).toContain("The notices meant for you arrive in Notifications");
    expect(markup).not.toContain("Os avisos");
  });
});
