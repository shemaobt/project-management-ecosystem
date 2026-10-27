import axios, { type InternalAxiosRequestConfig } from "axios";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Against the server the whole-project list is BE-05's browse, unfiltered and unpaged
 * (OBT-557): the server scopes it to the reader and reduces what it must, and the store keeps
 * none of it in the browser.
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
    raw: data,
  };
}

const storage = createMemoryStorage();
vi.stubGlobal("localStorage", storage);
vi.stubGlobal("window", { localStorage: storage });
vi.stubEnv("VITE_DATA_SOURCE", "api");

const CARD = {
  id: "op-7f3a",
  languageName: "Tikuna",
  languageCode: "tca",
  bridgeLanguage: "",
  vitalityStatus: "",
  location: "south-america",
  location2: null,
  speakerCount: "",
  coords: [-70, -4],
  translationType: [],
  financialResources: [],
  team: "",
  teamLeader: "",
  mentor: "",
  partnerOrg: "",
  objective: [],
  scopeDetails: "",
  totalUnits: 0,
  totalUnitsType: "",
  translatedUnits: 0,
  communityCheckedUnits: 0,
  approvedUnits: 0,
  startDate: null,
  deadline: null,
  locationWithheld: true,
  readAs: "other",
  statusComments: "",
  statusGoal: "",
  orgRole: "",
  healthEmotional: null,
  healthRelational: null,
  healthSpiritual: null,
  healthPhysical: null,
  healthAssessmentDate: null,
  healthAssessor: "",
  healthNotes: "",
  needs: [],
  needsNotes: "",
  notes: "",
  inEten: false,
  lastUpdated: null,
  derived: null,
};

const PAGE = {
  items: [CARD],
  counts: { groups: {}, presets: {}, groupAll: {} },
  matched: 1,
  total: 1,
  locationsWithheld: 1,
};

const calls: { path: string; params: string }[] = [];
let pages: unknown[] = [];
let held: Promise<void> | null = null;
const adapter = async (config: InternalAxiosRequestConfig) => {
  calls.push({ path: config.url ?? "", params: String(config.params ?? "") });
  if (held) await held;
  return {
    data: pages.shift() ?? PAGE,
    status: 200,
    statusText: "",
    headers: {},
    config,
  };
};

const { http } = await import("../../services/api/client");
http.defaults.adapter = adapter;
axios.defaults.adapter = adapter;

const { useProjectsStore } = await import("../projectsStore");
const { NOT_HYDRATED } = await import("../hydration");
const { default: i18n } = await import("../../i18n");
const { INDICATORS, indicatorCount, listFacets } = await import("../../utils/indicators");
const { getStaleStatus } = await import("../../utils/recency");
const { IndicatorBand } = await import("../../components/pages/inicio/IndicatorBand");
const { InicioView } = await import("../../components/pages/inicio");
const { RelatorioView } = await import("../../components/pages/ritmo/relatorio/RelatorioPage");
const { buildAnnualReport } = await import("../../utils/annualReport");

describe("a lista inteira contra o servidor", () => {
  it("vem da busca do servidor, sem filtro e sem página", async () => {
    await useProjectsStore.getState().hydrate();

    expect(calls.map((call) => call.path)).toEqual(["/shema/projects"]);
    expect(calls[0]?.params).not.toContain("limit");
    expect(useProjectsStore.getState().projects.map((project) => project.id)).toEqual([
      "op-7f3a",
    ]);
  });

  it("o número de locais recolhidos é o que o servidor contou", () => {
    expect(useProjectsStore.getState().locationsWithheld).toBe(1);
  });

  it("nada dela fica guardado no navegador", () => {
    expect(storage.raw.get("shema-projects-v1") ?? "").not.toContain("op-7f3a");
  });
});

const store = () => useProjectsStore.getState();
const spec = (id: (typeof INDICATORS)[number]["id"]) =>
  INDICATORS.find((candidate) => candidate.id === id)!;

/** Each linked number of the band, by the address its click opens. */
function bandNumbers(markup: string): Record<string, string> {
  const shown: Record<string, string> = {};
  for (const [, href, number] of markup.matchAll(/<a[^>]*href="([^"]+)"[^>]*><div[^>]*>([^<]*)</gu)) {
    shown[href.replaceAll("&amp;", "&")] = number;
  }
  return shown;
}

const band = () =>
  renderToStaticMarkup(
    createElement(MemoryRouter, null, createElement(IndicatorBand, { facets: store().facets })),
  );

/**
 * Chichewa (OBT-590): in progress, started years ago, progress recorded today. The card carries
 * no progress history — the server keeps it — so read off the card alone it looks 120+ days
 * quiet; the server, which reads the history, answers `em-dia` and counts it so.
 */
const CHICHEWA = {
  ...CARD,
  id: "chichewa",
  languageName: "Chichewa",
  location: "Malawi",
  locationWithheld: false,
  readAs: "coordination",
  team: "JOCUM Lilongwe",
  startDate: "2019-02-11",
  lastUpdated: "2026-10-16",
  derived: {
    status: "em-andamento",
    health: "na",
    stale: "em-dia",
    progress: 40,
    priority: "default",
    healthScore: 0,
    daysSinceUpdate: 0,
    lastProgressUpdate: "2026-10-16",
    region: "africa",
  },
};

const servedPage = (items: unknown[], inProgress: number) => ({
  items,
  counts: {
    groups: {
      status: { "em-andamento": inProgress },
      stale: { "em-dia": inProgress, atencao: 0, critico: 0 },
      team: { "JOCUM Lilongwe": inProgress },
    },
    presets: { attention: 0, prayer: 0, celebrate: 0, recent: inProgress },
    groupAll: {},
  },
  matched: items.length,
  total: items.length,
  locationsWithheld: null,
});

async function freshSession() {
  await i18n.changeLanguage("pt");
  calls.length = 0;
  pages = [];
  held = null;
  useProjectsStore.setState({
    projects: [],
    locationsWithheld: null,
    facets: null,
    outdated: false,
    ...NOT_HYDRATED,
  });
}

describe("a faixa conta o que o servidor conta (OBT-590)", () => {
  beforeEach(freshSession);

  it("as contagens do browse ficam no store, e não no navegador", async () => {
    pages = [servedPage([CHICHEWA], 1)];
    await store().hydrate();

    expect(store().facets?.matched).toBe(1);
    expect(store().facets?.counts.stale["em-dia"]).toBe(1);
    expect(storage.raw.get("shema-projects-v1") ?? "").not.toContain("em-dia");
  });

  it("um projeto em andamento, começado há anos e com progresso de hoje, não entra em Urgentes nem em Sem notícias", async () => {
    pages = [servedPage([CHICHEWA], 1)];
    await store().hydrate();
    const facets = store().facets!;

    expect(indicatorCount(spec("urgent"), facets)).toBe(0);
    expect(indicatorCount(spec("noNews"), facets)).toBe(0);
    expect(indicatorCount(spec("inProgress"), facets)).toBe(1);
    expect(indicatorCount(spec("languages"), facets)).toBe(1);

    const shown = bandNumbers(band());
    expect(shown["/projetos?presets=attention"]).toBe("0");
    expect(shown["/projetos?stale=atencao"]).toBe("0");
    expect(shown["/projetos?status=em-andamento"]).toBe("1");
    expect(shown["/projetos"]).toBe("1");
  });

  it("e a conta no cliente, sobre o mesmo cartão, é a que errava", async () => {
    pages = [servedPage([CHICHEWA], 1)];
    await store().hydrate();
    const [card] = store().projects;

    expect(card.derived?.stale).toBe("em-dia");
    expect(getStaleStatus(card)).toBe("critico");
    const counted = listFacets(store().projects);
    expect(indicatorCount(spec("noNews"), counted)).toBe(1);
    expect(indicatorCount(spec("urgent"), counted)).toBe(1);
  });
});

describe("a lista relê depois de uma escrita, e só então (OBT-590)", () => {
  const TIKUNA = { ...CHICHEWA, id: "tikuna", languageName: "Tikuna" };

  beforeEach(freshSession);

  it("voltar a uma tela sem escrita não pede a lista outra vez", async () => {
    await store().hydrate();
    await store().hydrate();

    expect(calls).toHaveLength(1);
  });

  it("depois da escrita a faixa fica sem número, e a próxima leitura traz o projeto novo", async () => {
    pages = [servedPage([CHICHEWA], 1), servedPage([CHICHEWA, TIKUNA], 2)];
    await store().hydrate();

    store().invalidate();
    expect(store().outdated).toBe(true);
    expect(store().hydrated).toBe(true);
    const page = renderToStaticMarkup(
      createElement(
        MemoryRouter,
        null,
        createElement(InicioView, {
          projects: store().projects,
          facets: store().facets,
          onOpen: () => undefined,
        }),
      ),
    );
    const hero = page.slice(0, page.indexOf("</section>"));
    expect(hero.split("—").length - 1).toBe(6);
    expect(hero).not.toMatch(/>\d+</u);
    expect(page).toContain("<svg");

    await store().hydrate();

    expect(calls).toHaveLength(2);
    expect(store().outdated).toBe(false);
    expect(store().projects.map((project) => project.id)).toEqual(["chichewa", "tikuna"]);
    expect(bandNumbers(band())["/projetos"]).toBe("2");
    expect(bandNumbers(band())["/projetos?status=em-andamento"]).toBe("2");
  });

  it("uma leitura que começou antes da escrita é lida de novo", async () => {
    let release = () => {};
    held = new Promise<void>((resolve) => {
      release = resolve;
    });
    pages = [servedPage([CHICHEWA], 1), servedPage([CHICHEWA, TIKUNA], 2)];

    const reading = store().hydrate();
    store().invalidate();
    release();
    await reading;

    expect(calls).toHaveLength(2);
    expect(store().facets?.matched).toBe(2);
    expect(store().outdated).toBe(false);
  });
});

const concluded = (id: string, languageName: string, location: string, completedDate: string | null) => ({
  ...CHICHEWA,
  id,
  languageName,
  location,
  startDate: null,
  completedDate,
  derived: { ...CHICHEWA.derived, status: "concluido" },
});

describe("a Celebração conta os finalizados que a lista data (OBT-622)", () => {
  beforeEach(freshSession);

  it("um concluído datado em 2026 entra nos finalizados de 2026; só o sem data fica à parte", async () => {
    pages = [
      {
        ...PAGE,
        items: [
          concluded("luganda", "Luganda (QA)", "Uganda, Kampala", "2026-07-31"),
          concluded("tete", "ETEN Migrado do Notion (QA)", "Mozambique, Tete", null),
        ],
        matched: 2,
        total: 2,
        locationsWithheld: null,
      },
    ];
    await store().hydrate();

    const report = buildAnnualReport(store().projects, 2026);
    expect(report.finished).toBe(1);
    expect(report.finishedUndated).toBe(1);

    const markup = renderToStaticMarkup(
      createElement(RelatorioView, {
        projects: store().projects,
        year: 2026,
        onYearChange: () => undefined,
        now: new Date(2026, 9, 26),
      }),
    );
    expect(markup).toContain(i18n.t("relatorio_undated", { count: 1 }));
    expect(markup).toContain("Luganda (QA)");
    expect(markup).not.toContain("ETEN Migrado do Notion (QA)");
  });
});
