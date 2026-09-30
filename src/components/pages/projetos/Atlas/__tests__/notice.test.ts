import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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
const { makeProject } = await import("../../../../../utils/__tests__/factory");
const { MOCK_SESSION_KEY, projectBrowseAPI, projectsAPI } = await import(
  "../../../../../fixtures"
);
const { EMPTY_FILTERS } = await import("../../../../../stores/filtersStore");
const { DEFAULT_SORT } = await import("../../../../../constants/sorting");
const { SensitiveNotice } = await import("../GlobeOverlays");
const { AtlasView } = await import("..");
const { InicioView } = await import("../../../inicio");

const noticeOf = (count: number) =>
  i18n.t("atlas_sensitive_notice", { count });

const QUERY = {
  filters: EMPTY_FILTERS,
  search: "",
  sort: DEFAULT_SORT,
  limit: null,
  offset: 0,
};

beforeEach(async () => {
  await i18n.changeLanguage("pt");
});

afterEach(() => storage.clear());

describe("o aviso de retidos só monta quando a contagem vem", () => {
  it("o aviso não monta quando a contagem é null", () => {
    expect(
      renderToStaticMarkup(createElement(SensitiveNotice, { count: null })),
    ).toBe("");
  });

  it("o aviso monta com o número que veio", () => {
    expect(
      renderToStaticMarkup(createElement(SensitiveNotice, { count: 3 })),
    ).toContain(noticeOf(3));
  });

  it("o Atlas repassa ao globo a contagem da lista", () => {
    const projects = [
      makeProject({ id: "a", sensitiveCountry: true, coords: [10, 10] }),
    ];
    const view = (locationsWithheld: number | null) =>
      renderToStaticMarkup(
        createElement(AtlasView, {
          projects,
          locationsWithheld,
          onSelect: () => {},
        }),
      );
    expect(view(1)).toContain(noticeOf(1));
    expect(view(null)).not.toContain(noticeOf(1));
  });

  it("no dublê, só a coordenação recebe a contagem", async () => {
    storage.setItem(MOCK_SESSION_KEY, "obtLab");
    expect((await projectBrowseAPI.browse(QUERY)).locationsWithheld).toBeNull();
    storage.setItem(MOCK_SESSION_KEY, "resourceCircle");
    expect((await projectBrowseAPI.browse(QUERY)).locationsWithheld).toBeNull();

    storage.setItem(MOCK_SESSION_KEY, "globalStrategist");
    const coordination = await projectBrowseAPI.browse(QUERY);
    expect(coordination.locationsWithheld).toBe(
      coordination.items.filter((item) => item.sensitiveCountry).length,
    );
    expect(coordination.locationsWithheld).toBeGreaterThan(0);
  });

  it("o Início sem leitor não anuncia", async () => {
    const projects = await projectsAPI.list();
    expect(projects.some((project) => project.sensitiveCountry)).toBe(true);
    const markup = renderToStaticMarkup(
      createElement(
        MemoryRouter,
        null,
        createElement(InicioView, { projects, onOpen: () => undefined }),
      ),
    );
    expect(markup).toContain("<svg");
    expect(markup).not.toMatch(/projetos? em países? sensíve/);
  });
});
