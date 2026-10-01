import { createElement, type ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Where a build withholds the fixture project list (INT-12 · OBT-417), every screen that read it
 * says so — never an empty list that would read as *there are no projects*, and never a count of
 * zero. The fixture list is real people in real places, so server builds do not carry it.
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

const { default: i18n } = await import("../../../i18n");
const { makeProject } = await import("../../../utils/__tests__/factory");
const { InicioView } = await import("../inicio");
const { RelatorioView } = await import("../ritmo/relatorio/RelatorioPage");
const { FormulariosView } = await import("../formularios");
const { LeaderLinkDialogBody } = await import("../dados/LeaderLinkDialog");
const { EquipeView } = await import("../equipe");

const render = (element: ReactElement): string =>
  renderToStaticMarkup(createElement(MemoryRouter, null, element));

const projects = [makeProject({ id: "tikuna", languageName: "Tikuna", location: "Brazil" })];
const NOT_SERVED = () => i18n.t("projects_not_served");

beforeEach(async () => {
  await i18n.changeLanguage("pt");
});

describe("sem a lista de projetos, cada tela diz isso", () => {
  it("Início: nem faixa de indicadores nem globo", () => {
    const markup = render(createElement(InicioView, { projects, onOpen: () => {}, served: false }));

    expect(markup).toContain(NOT_SERVED());
    expect(markup).not.toContain("Tikuna");
  });

  it("relatório anual: nenhuma contagem", () => {
    const markup = render(
      createElement(RelatorioView, { projects, year: 2026, onYearChange: () => {}, served: false }),
    );

    expect(markup).toContain(NOT_SERVED());
    expect(markup).not.toContain(i18n.t("relatorio_started"));
  });

  it("Formulários: nem seletor nem blocos de um projeto de amostra", () => {
    const markup = render(createElement(FormulariosView, { projects, served: false }));

    expect(markup).toContain(NOT_SERVED());
    expect(markup).not.toContain("Tikuna");
  });

  it("Link do líder: nenhum link real para um projeto de amostra", () => {
    const markup = render(
      createElement(LeaderLinkDialogBody, {
        projects,
        selectedProjectId: "tikuna",
        onSelectProject: () => {},
        links: null,
        minted: null,
        minting: false,
        onMint: () => {},
        onRevoke: () => {},
        error: null,
        served: false,
      }),
    );

    expect(markup).toContain(NOT_SERVED());
    expect(markup).not.toContain(i18n.t("intake_generate"));
  });

  it("Equipe: as regiões continuam, sem uma contagem que diria zero", () => {
    const markup = render(
      createElement(EquipeView, {
        regions: [
          {
            key: "south-america",
            labelKey: "continent_south_america",
            team: { coordinator: "", obtLab: "", resourceCircle: "" },
          },
        ],
        projects: null,
        onSave: async () => ({ ok: true, outcome: { saved: 0, skipped: [] } }) as never,
      }),
    );

    expect(markup).not.toContain(i18n.t("equipe_projects_count", { count: 0 }));
  });
});
