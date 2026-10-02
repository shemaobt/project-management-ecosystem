import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

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
const { EMPTY_FILTERS } = await import("../../../../stores/filtersStore");
const { SORT_KEYS, sortKeysFor } = await import("../../../../constants/sorting");
const { absentGroups, emptyCounts, withoutAbsentFilters } = await import(
  "../../../../utils/search"
);
const { ADVANCED_SECTIONS, PRIMARY_SECTIONS, shownSections } = await import(
  "../Sidebar/Filters/sections"
);
const { DetailedFilters } = await import("../Sidebar/Filters");

const absent = (...groups: ReturnType<typeof absentGroups>) => ({
  ...emptyCounts(),
  absent: groups,
});

const sectionTitles = (markup: string): string[] =>
  [...markup.matchAll(/<h3[^>]*>[\s\S]*?<\/h3>/g)].map((match) =>
    match[0].replace(/<[^>]+>/g, "").trim(),
  );

describe("a faceta de saúde é da audiência de saúde (OBT-553)", () => {
  it("some quando o servidor não a manda, e também quando a sessão diz que o leitor não lê saúde", () => {
    expect(absentGroups(absent("health"), true)).toEqual(["health"]);
    expect(absentGroups(emptyCounts(), false)).toEqual(["health"]);
    expect(absentGroups(null, false)).toEqual(["health"]);
  });

  it("quem lê saúde e recebeu o grupo continua vendo-o", () => {
    expect(absentGroups(emptyCounts(), true)).toEqual([]);
    expect(absentGroups(null, true)).toEqual([]);
  });

  it("um filtro de saúde salvo não fica ativo para quem não lê saúde", () => {
    const filters = { ...EMPTY_FILTERS, health: "critica" as const, status: "pausado" as const };
    expect(withoutAbsentFilters(filters, ["health"])).toEqual({
      ...EMPTY_FILTERS,
      status: "pausado",
    });
  });

  it("sem filtro a tirar, os filtros voltam os mesmos — quem chama sabe que nada mudou", () => {
    const filters = { ...EMPTY_FILTERS, status: "pausado" as const };
    expect(withoutAbsentFilters(filters, ["health"])).toBe(filters);
    const withHealth = { ...EMPTY_FILTERS, health: "boa" as const };
    expect(withoutAbsentFilters(withHealth, [])).toBe(withHealth);
  });

  it("a seção Saúde não é desenhada, nem com zeros", () => {
    const sections = [...PRIMARY_SECTIONS, ...ADVANCED_SECTIONS];
    expect(shownSections(sections, ["health"]).map((section) => section.id)).not.toContain(
      "health",
    );
    expect(shownSections(sections, ["health"])).toHaveLength(sections.length - 1);
    expect(shownSections(sections, [])).toEqual(sections);
  });

  it("a barra lateral renderizada não traz o grupo Saúde para quem não o recebe", () => {
    const render = (hidden: ReturnType<typeof absentGroups>) =>
      sectionTitles(
        renderToStaticMarkup(
          createElement(DetailedFilters, {
            baseline: emptyCounts(),
            counts: emptyCounts(),
            hidden,
          }),
        ),
      );
    const title = i18n.t("sb_health");
    expect(render([]).some((text) => text.startsWith(title))).toBe(true);
    expect(render(["health"]).some((text) => text.startsWith(title))).toBe(false);
  });

  it("a ordem por saúde não é oferecida a quem não lê saúde", () => {
    expect(sortKeysFor(false)).not.toContain("health");
    expect(sortKeysFor(false)).toHaveLength(SORT_KEYS.length - 1);
    expect(sortKeysFor(true)).toEqual(SORT_KEYS);
  });
});

describe("o grupo Sensível é da coordenação (OBT-556)", () => {
  it("some quando o servidor não o manda, qualquer que seja a sessão", () => {
    expect(absentGroups(absent("sensitive"), true)).toEqual(["sensitive"]);
    expect(absentGroups(absent("sensitive"), false)).toEqual(["health", "sensitive"]);
  });

  it("um link salvo com ?sensitive não deixa um filtro fantasma ativo", () => {
    const filters = { ...EMPTY_FILTERS, sensitive: "yes" as const, eten: "yes" as const };
    expect(withoutAbsentFilters(filters, absentGroups(absent("sensitive"), true))).toEqual({
      ...EMPTY_FILTERS,
      eten: "yes",
    });
  });

  it("a seção Sensível não é desenhada", () => {
    const ids = shownSections(ADVANCED_SECTIONS, ["sensitive"]).map((section) => section.id);
    expect(ids).not.toContain("sensitive");
    expect(ids).toHaveLength(ADVANCED_SECTIONS.length - 1);
  });
});
