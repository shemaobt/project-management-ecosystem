import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ProjectFilters } from "../../../../../stores/filtersStore";
import type { GatedFacet } from "../../../../../utils/gatedFacets";

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

const { default: i18n } = await import("../../../../../i18n");
const { EMPTY_FILTERS, hasActiveFilters, useFiltersStore } = await import(
  "../../../../../stores/filtersStore"
);
const { emptyCounts } = await import("../../../../../utils/search");
const { buildFilterOptions } = await import("../Filters/sections");
const { activeFilterChips, chipLabel, focusIndexAfterRemoval } = await import(
  "../activeChips"
);
const { ActiveFiltersView } = await import("../ActiveFilters");

type ActiveValue<K extends keyof ProjectFilters> = Exclude<
  ProjectFilters[K],
  null | false
>;

const SAMPLE: { [K in keyof ProjectFilters]: ActiveValue<K> } = {
  team: "YWAM Sydney",
  objective: "NT",
  status: "em-andamento",
  health: "critica",
  financial: "Seed Company",
  stale: "atencao",
  country: "Brazil",
  continent: "africa",
  vitality: "Vital",
  translationType: "OBT",
  eten: "yes",
  sensitive: "no",
  progressRange: "0-25",
  needCategory: "financial",
  hasMedia: "yes",
  hasOpenNeeds: "no",
  attention: true,
  prayer: true,
  celebrate: true,
  recent: true,
};

const FILTER_KEYS = Object.keys(EMPTY_FILTERS) as (keyof ProjectFilters)[];

const withFilters = (overrides: Partial<ProjectFilters>): ProjectFilters => ({
  ...EMPTY_FILTERS,
  ...overrides,
});

const options = buildFilterOptions(emptyCounts());

const chipsOf = (
  filters: ProjectFilters,
  hidden: readonly GatedFacet[] = [],
) => activeFilterChips(filters, options, hidden);

const labelsOf = (filters: ProjectFilters, hidden: readonly GatedFacet[] = []) =>
  chipsOf(filters, hidden).map((chip) => chipLabel(chip, i18n.t));

const render = (filters: ProjectFilters) =>
  renderToStaticMarkup(
    createElement(ActiveFiltersView, {
      baseline: emptyCounts(),
      hidden: [],
      filters,
      onRemove: () => {},
    }),
  );

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

beforeEach(async () => {
  await i18n.changeLanguage("pt");
  storage.clear();
  useFiltersStore.setState({ filters: { ...EMPTY_FILTERS }, search: "" });
});

describe("a faixa Filtros ativos (OBT-643)", () => {
  it("sem filtro ativo, a faixa não aparece — nem com busca, que não é filtro", () => {
    expect(render(EMPTY_FILTERS)).toBe("");
    useFiltersStore.getState().setSearch("kaaps");
    expect(chipsOf(useFiltersStore.getState().filters)).toEqual([]);
  });

  it("um filtro de seção primária vira um chip na faixa, que é um botão que diz o que tira", () => {
    const markup = render(withFilters({ status: "em-andamento" }));
    expect(markup).toMatch(/<h2\b[^>]*>Filtros ativos<\/h2>/);
    const [chip, ...rest] = buttons(markup);
    expect(rest).toEqual([]);
    expect(chip.text).toBe("Em andamento");
    expect(attr(chip, "type")).toBe("button");
    expect(attr(chip, "aria-label")).toBe("Tirar o filtro Em andamento");
  });

  it("um filtro de Mais filtros vira um chip, sem depender de a seção estar aberta", () => {
    const markup = render(withFilters({ stale: "atencao" }));
    expect(buttons(markup).map((chip) => chip.text)).toEqual([
      "Sem notícias 60+ dias",
    ]);
    expect(attr(buttons(markup)[0], "aria-label")).toBe(
      "Tirar o filtro Sem notícias 60+ dias",
    );
  });

  it("primária, Mais filtros, região e atalho juntos: um chip por filtro, na ordem do protótipo", () => {
    const markup = render(
      withFilters({
        attention: true,
        stale: "atencao",
        continent: "africa",
        status: "em-andamento",
      }),
    );
    expect(buttons(markup).map((chip) => chip.text)).toEqual([
      "Em andamento",
      "Sem notícias 60+ dias",
      "África",
      "Pedem atenção",
    ]);
  });

  it.each(FILTER_KEYS)(
    "o filtro %s vira exatamente um chip, e tirar o chip tira o filtro",
    (key) => {
      const filters = withFilters({ [key]: SAMPLE[key] });
      const chips = chipsOf(filters);
      expect(chips.map((chip) => chip.key)).toEqual([key]);
      const label = chipLabel(chips[0], i18n.t);
      expect(label).not.toBe("");
      expect(label).not.toMatch(/undefined|null|^sb_|^preset_|^continent_/);

      useFiltersStore.setState({ filters });
      useFiltersStore.getState().clearFilter(chips[0].key);
      expect(useFiltersStore.getState().filters).toEqual(EMPTY_FILTERS);
      expect(hasActiveFilters(useFiltersStore.getState().filters)).toBe(false);
    },
  );

  it("tirar um chip deixa os outros filtros como estavam", () => {
    const filters = withFilters({
      status: "em-andamento",
      stale: "atencao",
      continent: "africa",
      attention: true,
    });
    useFiltersStore.setState({ filters });
    useFiltersStore.getState().clearFilter("stale");
    const left = useFiltersStore.getState().filters;
    expect(left).toEqual({ ...filters, stale: null });
    expect(chipsOf(left).map((chip) => chip.key)).toEqual([
      "status",
      "continent",
      "attention",
    ]);
  });

  it("ETEN, País sensível e % Progresso dizem o grupo; os outros dizem só o que a opção diz na barra", () => {
    expect(
      labelsOf(
        withFilters({ eten: "yes", sensitive: "no", progressRange: "0-25" }),
      ),
    ).toEqual(["ETEN: Sim", "País sensível: Aberto", "% Progresso: 0–25%"]);
    expect(
      labelsOf(
        withFilters({ team: "YWAM Sydney", vitality: "Vital", hasMedia: "yes" }),
      ),
    ).toEqual(["YWAM Sydney", i18n.t("vit_vital"), "Com fotos/vídeos"]);
  });

  it("em inglês, o chip e o nome do botão saem do catálogo inglês", async () => {
    await i18n.changeLanguage("en");
    const markup = render(withFilters({ eten: "no", status: "concluido" }));
    expect(
      buttons(markup).map((chip) => [chip.text, attr(chip, "aria-label")]),
    ).toEqual([
      ["Completed", "Remove filter Completed"],
      ["ETEN: No", "Remove filter ETEN: No"],
    ]);
    expect(markup).toContain(">Active filters</h2>");
  });

  it("um grupo que o leitor não recebe não vira chip", () => {
    const filters = withFilters({
      status: "pausado",
      health: "critica",
      sensitive: "yes",
    });
    expect(chipsOf(filters, ["health", "sensitive"]).map((c) => c.key)).toEqual([
      "status",
    ]);
    expect(chipsOf(filters).map((c) => c.key)).toEqual([
      "status",
      "health",
      "sensitive",
    ]);
  });

  it("um valor que a barra não lista mais aparece como ele mesmo, nunca some", () => {
    expect(labelsOf(withFilters({ team: "Base que fechou" }))).toEqual([
      "Base que fechou",
    ]);
  });
});

describe("o foco depois de tirar um chip (§7.5)", () => {
  it("vai ao chip que ocupou o lugar do que saiu", () => {
    expect(focusIndexAfterRemoval(0, 2)).toBe(0);
    expect(focusIndexAfterRemoval(1, 2)).toBe(1);
  });

  it("vai ao anterior quando saiu o último", () => {
    expect(focusIndexAfterRemoval(2, 2)).toBe(1);
  });

  it("não aponta chip nenhum quando não sobra chip — a faixa sai junto", () => {
    expect(focusIndexAfterRemoval(0, 0)).toBeNull();
  });
});
