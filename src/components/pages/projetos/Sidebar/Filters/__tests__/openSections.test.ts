import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { ProjectFilters } from "../../../../../../stores/filtersStore";

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

const { default: i18n } = await import("../../../../../../i18n");
const { EMPTY_FILTERS } = await import("../../../../../../stores/filtersStore");
const { decodeView } = await import("../../../../../../utils/filterSerialisation");
const { emptyCounts } = await import("../../../../../../utils/search");
const { ADVANCED_SECTIONS, fitOpenSections, openSectionsFor } = await import(
  "../sections"
);
const { DetailedFiltersView } = await import("..");

interface RenderedButton {
  attrs: string;
  text: string;
}

const buttons = (markup: string): RenderedButton[] =>
  [...markup.matchAll(/<button([^>]*)>([\s\S]*?)<\/button>/g)].map(
    ([, attrs, inner]) => ({ attrs, text: inner.replace(/<[^>]+>/g, "").trim() }),
  );

const attr = (button: RenderedButton | undefined, name: string) =>
  button?.attrs.match(new RegExp(`${name}="([^"]*)"`))?.[1];

const controlling = (markup: string, id: string) =>
  buttons(markup).find((button) => button.attrs.includes(`aria-controls="${id}"`));

const render = (filters: ProjectFilters) =>
  renderToStaticMarkup(
    createElement(DetailedFiltersView, {
      baseline: emptyCounts(),
      counts: emptyCounts(),
      hidden: [],
      filters,
      onSelect: () => {},
    }),
  );

const withFilters = (overrides: Partial<ProjectFilters>): ProjectFilters => ({
  ...EMPTY_FILTERS,
  ...overrides,
});

describe("Mais filtros abre com um filtro dele ativo (OBT-634)", () => {
  const fromAddress = decodeView(new URLSearchParams("stale=atencao")).filters;

  it("abrir /projetos?stale=atencao mostra a opção de Atualização visível e marcada", () => {
    const markup = render(fromAddress);
    expect(attr(controlling(markup, "sb-advanced-filters"), "aria-expanded")).toBe("true");
    expect(attr(controlling(markup, "sb-filter-stale"), "aria-expanded")).toBe("true");
    const option = buttons(markup).find((button) =>
      button.text.startsWith(i18n.t("stale_attention")),
    );
    expect(attr(option, "aria-pressed")).toBe("true");
    expect(option?.attrs).not.toMatch(/\sdisabled(=|\s|$)/);
  });

  it("só a seção do filtro abre — as outras de Mais filtros seguem recolhidas", () => {
    const markup = render(fromAddress);
    for (const section of ADVANCED_SECTIONS.filter((s) => s.id !== "stale")) {
      expect(
        attr(controlling(markup, `sb-filter-${section.id}`), "aria-expanded"),
        section.id,
      ).toBe("false");
    }
  });

  it("sem filtro de Mais filtros, a barra abre como o protótipo, com Mais filtros recolhido", () => {
    const markup = render(EMPTY_FILTERS);
    expect(attr(controlling(markup, "sb-advanced-filters"), "aria-expanded")).toBe("false");
    expect(markup).not.toContain(i18n.t("stale_attention"));
  });

  it("uma visão salva que traz um filtro de Mais filtros abre a barra e a seção dele", () => {
    const fitted = fitOpenSections(
      openSectionsFor(EMPTY_FILTERS, []),
      withFilters({ stale: "critico" }),
      [],
    );
    expect(fitted.advanced).toBe(true);
    expect(fitted.sections.has("stale")).toBe(true);
  });

  it("o que o leitor fechou com o filtro já ativo continua fechado enquanto o valor não muda", () => {
    const open = openSectionsFor(fromAddress, []);
    const closed = { ...open, advanced: false, sections: new Set(["status" as const]) };
    const fitted = fitOpenSections(closed, { ...fromAddress, status: "pausado" }, []);
    expect(fitted.advanced).toBe(false);
    expect(fitted.sections.has("stale")).toBe(false);
  });

  it("trocar o valor de um filtro de Mais filtros reabre a seção", () => {
    const open = openSectionsFor(fromAddress, []);
    const closed = { ...open, advanced: false, sections: new Set(["status" as const]) };
    const fitted = fitOpenSections(closed, { ...fromAddress, stale: "critico" }, []);
    expect(fitted.advanced).toBe(true);
    expect(fitted.sections.has("stale")).toBe(true);
  });

  it("limpar os filtros não abre nem fecha nada", () => {
    const open = openSectionsFor(fromAddress, []);
    const cleared = fitOpenSections(open, { ...EMPTY_FILTERS }, []);
    expect(cleared.advanced).toBe(true);
    expect([...cleared.sections]).toEqual([...open.sections]);
  });

  it("um grupo que o leitor não recebe não abre Mais filtros", () => {
    const sensitive = withFilters({ sensitive: "yes" });
    expect(openSectionsFor(sensitive, ["sensitive"]).advanced).toBe(false);
    expect(openSectionsFor(sensitive, []).advanced).toBe(true);
  });

  it("ajustar de novo aos mesmos filtros não muda nada — o ajuste feito no render converge", () => {
    const once = fitOpenSections(openSectionsFor(EMPTY_FILTERS, []), fromAddress, []);
    expect(once.fittedTo).toBe(fromAddress);
    const twice = fitOpenSections(once, fromAddress, []);
    expect(twice.advanced).toBe(once.advanced);
    expect([...twice.sections]).toEqual([...once.sections]);
  });
});
