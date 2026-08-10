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

const { projectsAPI } = await import("../../../../../fixtures");
const { EMPTY_FILTERS } = await import("../../../../../stores/filtersStore");
const { useSavedViewsStore, MAX_VIEWS_PER_USER, normaliseViewName } =
  await import("../../../../../stores/savedViewsStore");
const { encodeView, decodeView, encodeViewToUrl, isEmptyView } = await import(
  "../../../../../utils/filterSerialisation"
);
type ViewState = import("../../../../../utils/filterSerialisation").ViewState;
const { filterProjects } = await import("../../../../../utils/search");
const { sortProjects } = await import("../../sorting");
const { applicableState, datasetCounts, findUnavailable } = await import(
  "../availability"
);

const projects = await projectsAPI.list();
const counts = datasetCounts(projects);

const COMPLEX: ViewState = {
  filters: {
    ...EMPTY_FILTERS,
    status: "em-andamento",
    continent: "africa",
    sensitive: "no",
    progressRange: "0-25",
  },
  search: "a",
  sort: "progress",
  metaphor: "diario",
};

const WITH_PRESETS: ViewState = {
  ...COMPLEX,
  filters: { ...COMPLEX.filters, attention: true, recent: true },
};

const resultIds = (state: ViewState) =>
  sortProjects(
    filterProjects(projects, state.filters, state.search).projects,
    state.sort,
    "pt",
  ).map((project) => project.id);

beforeEach(() => {
  storage.clear();
  useSavedViewsStore.setState({ byUser: {} });
});

describe("a URL carrega a visão inteira", () => {
  it("volta com os mesmos filtros, busca, ordenação e metáfora", () => {
    expect(decodeView(encodeView(COMPLEX))).toEqual(COMPLEX);
  });

  it("um conjunto complexo produz o mesmo resultado depois da ida e volta", () => {
    const restored = decodeView(encodeView(COMPLEX));
    expect(resultIds(restored)).toEqual(resultIds(COMPLEX));
    expect(resultIds(restored).length).toBeGreaterThan(0);
  });

  it("os presets combináveis também voltam", () => {
    expect(decodeView(encodeView(WITH_PRESETS))).toEqual(WITH_PRESETS);
  });

  it("descarta valor que não existe no vocabulário em vez de quebrar", () => {
    const params = new URLSearchParams(encodeView(COMPLEX));
    params.set("status", "inventado");
    params.set("sort", "inventado");
    params.set("view", "inventado");
    const restored = decodeView(params);
    expect(restored.filters.status).toBeNull();
    expect(restored.sort).toBe("deadline");
    expect(restored.metaphor).toBe("atlas");
    expect(restored.filters.continent).toBe("africa");
  });

  it("não escreve parâmetro para o estado vazio", () => {
    const empty: ViewState = {
      filters: { ...EMPTY_FILTERS },
      search: "",
      sort: "deadline",
      metaphor: "atlas",
    };
    expect(encodeView(empty).toString()).toBe("");
    expect(isEmptyView(empty)).toBe(true);
    expect(encodeViewToUrl(empty, "https://shema.app/projetos")).toBe(
      "https://shema.app/projetos",
    );
    expect(encodeViewToUrl(COMPLEX, "https://shema.app/projetos")).toContain(
      "?",
    );
  });
});

describe("a visão guarda critério, não resultado", () => {
  it("reavalia contra os dados vivos", () => {
    const view: ViewState = {
      ...COMPLEX,
      filters: { ...EMPTY_FILTERS, status: "em-andamento" },
    };
    const all = filterProjects(projects, view.filters, "").projects;
    const half = projects.slice(0, Math.floor(projects.length / 2));
    const fewer = filterProjects(half, view.filters, "").projects;
    expect(all.length).toBeGreaterThan(fewer.length);
    expect(fewer.every((project) => all.includes(project))).toBe(true);
  });
});

describe("uma visão com valor que sumiu degrada com aviso", () => {
  it("aponta qual filtro não se aplica mais", () => {
    const stale: ViewState = {
      ...COMPLEX,
      filters: { ...COMPLEX.filters, team: "Base Que Nao Existe" },
    };
    const missing = findUnavailable(stale.filters, counts);
    expect(missing).toEqual([{ key: "team", value: "Base Que Nao Existe" }]);
  });

  it("abre o resto da visão em vez de errar o conjunto", () => {
    const stale: ViewState = {
      ...COMPLEX,
      filters: { ...COMPLEX.filters, team: "Base Que Nao Existe" },
    };
    const { state, missing } = applicableState(stale, counts);
    expect(missing).toHaveLength(1);
    expect(state.filters.team).toBeNull();
    expect(resultIds(state)).toEqual(resultIds(COMPLEX));
  });

  it("não reclama de uma visão inteiramente válida", () => {
    expect(findUnavailable(COMPLEX.filters, counts)).toEqual([]);
  });
});

describe("as visões são de cada usuário", () => {
  it("uma pessoa não vê a visão da outra", () => {
    const { saveView } = useSavedViewsStore.getState();
    saveView("karina", "Segunda-feira", COMPLEX);
    const { byUser } = useSavedViewsStore.getState();
    expect(byUser.karina).toHaveLength(1);
    expect(byUser.levi).toBeUndefined();
  });

  it("renomeia e exclui só a visão apontada", () => {
    const { saveView } = useSavedViewsStore.getState();
    const first = saveView("karina", "Segunda", COMPLEX);
    const second = saveView("karina", "Terça", COMPLEX);
    useSavedViewsStore.getState().renameView("karina", first!.id, "Semana");
    useSavedViewsStore.getState().removeView("karina", second!.id);
    const views = useSavedViewsStore.getState().byUser.karina;
    expect(views).toHaveLength(1);
    expect(views[0].name).toBe("Semana");
  });

  it("guarda o critério da visão, não os projetos", () => {
    const { saveView } = useSavedViewsStore.getState();
    const view = saveView("karina", "Segunda", COMPLEX);
    expect(view?.state).toEqual(COMPLEX);
    expect(JSON.stringify(view)).not.toContain("projects");
  });

  it("recusa nome vazio e para no limite por usuário", () => {
    const { saveView } = useSavedViewsStore.getState();
    expect(saveView("karina", "   ", COMPLEX)).toBeNull();
    for (let i = 0; i < MAX_VIEWS_PER_USER; i += 1) {
      expect(saveView("karina", `Visão ${i}`, COMPLEX)).not.toBeNull();
    }
    expect(saveView("karina", "Uma a mais", COMPLEX)).toBeNull();
    expect(saveView("levi", "Primeira dele", COMPLEX)).not.toBeNull();
  });

  it("normaliza o nome antes de guardar", () => {
    expect(normaliseViewName("  Minha   visão  ")).toBe("Minha visão");
    expect(normaliseViewName("x".repeat(60))).toHaveLength(40);
  });
});
