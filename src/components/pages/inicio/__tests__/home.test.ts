import { createElement, type ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

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
const { makeProject } = await import("../../../../utils/__tests__/factory");
const { Hero } = await import("../Hero");
const { IndicatorBand } = await import("../IndicatorBand");
const { InicioPage, InicioView } = await import("../index");

const render = (element: ReactElement): string =>
  renderToStaticMarkup(createElement(MemoryRouter, null, element));

const hero = (projects: Parameters<typeof Hero>[0]["projects"]): string =>
  render(createElement(Hero, { projects }));

const band = (
  projects: Parameters<typeof IndicatorBand>[0]["projects"],
): string => render(createElement(IndicatorBand, { projects }));

const countOf = (markup: string, needle: string): number =>
  markup.split(needle).length - 1;

beforeEach(async () => {
  await i18n.changeLanguage("pt");
});

describe("saudação", () => {
  it("renderiza o convite e o שמע", () => {
    const markup = hero(null);
    expect(markup).toContain("Vem ouvir.");
    expect(markup).toContain("Assim na terra");
    expect(markup).toContain("como no céu.");
    expect(markup).toContain("שמע");
    expect(markup).toContain("<em");
    expect(markup).toContain("<h1");
  });

  it("acompanha o idioma ativo", async () => {
    await i18n.changeLanguage("en");
    const markup = hero(null);
    expect(markup).toContain("Come listen.");
    expect(markup).toContain("On earth");
    expect(markup).toContain("No news");
    expect(markup).not.toContain("Vem ouvir.");
  });
});

describe("faixa de indicadores", () => {
  it("carregando nunca vira 0", () => {
    const markup = band(null);
    expect(markup).not.toContain(">0<");
    expect(countOf(markup, "—")).toBe(6);
    expect(markup).toContain(i18n.t("loading"));
  });

  it("zero é boa notícia: número real, tinta calma", () => {
    const markup = band([]);
    expect(countOf(markup, ">0<")).toBe(6);
    expect(markup).not.toContain("—");
    expect(markup).not.toContain("text-telha");
  });

  it("o acento telha só acende com contagem acima de zero", () => {
    const markup = band([makeProject({ healthEmotional: "critica" })]);
    expect(countOf(markup, "text-telha")).toBe(1);
    expect(markup).toContain(">1<");
  });

  it("cada indicador de projetos leva à lista com seu filtro pré-aplicado", () => {
    const markup = band([]);
    expect(markup).toContain('href="/projetos?presets=attention"');
    expect(markup).toContain('href="/projetos?stale=atencao"');
    expect(markup).toContain('href="/projetos?status=em-andamento"');
    expect(markup).toContain('href="/projetos?status=concluido"');
    expect(countOf(markup, 'href="/projetos"')).toBe(1);
  });

  it("bases não é link: a lista não tem como mostrar bases", () => {
    const markup = band([]);
    expect(countOf(markup, "<a ")).toBe(5);
    expect(markup).toContain("Bases");
  });

  it("rótulos e caudas vêm do catálogo ativo", () => {
    const markup = band([]);
    expect(markup).toContain("Línguas");
    expect(markup).toContain("em movimento");
    expect(markup).toContain("Sem notícias");
    expect(markup).toContain("há mais de 60 dias");
  });
});

describe("página Início", () => {
  it("antes da hidratação mostra o hero sem números e sem globo", () => {
    const markup = render(createElement(InicioPage));
    expect(countOf(markup, "—")).toBe(6);
    expect(markup).not.toContain(">0<");
    expect(markup).not.toContain(i18n.t("atlas_stat_languages"));
  });

  it("hidratada, renderiza o Atlas abaixo do hero", () => {
    const markup = render(
      createElement(InicioView, {
        projects: [
          makeProject({ id: "p-1", languageName: "Aurora", coords: [10, 10] }),
          makeProject({ id: "p-2", languageName: "Boreal", coords: [-40, -5] }),
        ],
        onOpen: () => undefined,
      }),
    );
    expect(markup).toContain(">2<");
    expect(markup).toContain(i18n.t("atlas_stat_languages"));
    expect(markup).toContain("<svg");
  });
});
