import axios, { type InternalAxiosRequestConfig } from "axios";
import { beforeEach, describe, expect, it } from "vitest";
import { DEFAULT_SORT } from "../../../constants/sorting";
import { EMPTY_FILTERS } from "../../../stores/filtersStore";

const { http } = await import("../client");
const { projectBrowseAPI } = await import("../projectBrowse");

type Reply = { status: number; data?: unknown };

let script: (config: InternalAxiosRequestConfig) => Reply;
let lastConfig: InternalAxiosRequestConfig | null = null;

const adapter = async (config: InternalAxiosRequestConfig) => {
  lastConfig = config;
  const reply = script(config);
  const response = {
    data: reply.data ?? null,
    status: reply.status,
    statusText: "",
    headers: {},
    config,
  };
  if (reply.status >= 200 && reply.status < 300) return response;
  throw { code: "ERR_BAD_REQUEST", config, response };
};

http.defaults.adapter = adapter;
axios.defaults.adapter = adapter;

const WIRE_ASHANINKA = {
  id: "ashaninka",
  languageName: "Asháninka",
  languageCode: "cni",
  bridgeLanguage: "",
  vitalityStatus: "",
  speakerCount: "",
  location: "Peru",
  location2: null,
  team: "YWAM Aurora",
  teamLeader: "Fresia",
  mentor: "Daniel",
  partnerOrg: "",
  orgRole: "",
  facilitator: null,
  objective: ["NT"],
  translationType: [],
  financialResources: [],
  portion: null,
  scopeDetails: "",
  totalUnits: 260,
  totalUnitsType: "Capítulos",
  translatedUnits: 0,
  communityCheckedUnits: 0,
  approvedUnits: 0,
  statusGoal: "Goal Met in the language",
  statusComments: "eles começaram mas estão aguardando",
  healthEmotional: null,
  healthRelational: null,
  healthSpiritual: null,
  healthPhysical: null,
  healthAssessmentDate: null,
  healthAssessor: "",
  healthNotes: "",
  startDate: null,
  deadline: null,
  lastUpdated: "2024-11-29",
  inEten: false,
  needsNotes: "",
  notes: "",
  needs: [
    { category: "financial", urgency: "high", status: "open", prayerShared: true, prayerAnswered: false },
  ],
  derived: {
    status: "pausado",
    health: "na",
    stale: null,
    progress: 0,
    priority: "paused",
    healthScore: 0,
    daysSinceUpdate: null,
    lastProgressUpdate: null,
    region: "south-america",
  },
  coords: [-75, -10],
  locationWithheld: false,
};

const WIRE_PAGE = {
  items: [WIRE_ASHANINKA],
  counts: {
    groups: {
      status: { pausado: 1 },
      continent: { "south-america": 1 },
    },
    presets: { attention: 0, prayer: 1, celebrate: 0, recent: 0 },
    groupAll: { status: 1, continent: 1 },
  },
  matched: 1,
  total: 127,
  limit: null,
  offset: 0,
  sort: "deadline",
  locationsWithheld: null,
};

beforeEach(() => {
  lastConfig = null;
  script = () => ({ status: 200, data: WIRE_PAGE });
});

describe("a query que a Projetos manda", () => {
  it("é a mesma URL compartilhada da tela, mais limit e offset", async () => {
    await projectBrowseAPI.browse({
      filters: { ...EMPTY_FILTERS, status: "em-andamento", continent: "africa", attention: true },
      search: "waima",
      sort: "name",
      limit: 30,
      offset: 0,
    });
    const params = lastConfig?.params as URLSearchParams;
    expect(params.get("status")).toBe("em-andamento");
    expect(params.get("continent")).toBe("africa");
    expect(params.get("presets")).toBe("attention");
    expect(params.get("q")).toBe("waima");
    expect(params.get("sort")).toBe("name");
    expect(params.get("limit")).toBe("30");
    // Never the card metaphor — the server's ShemaProjectQuery has extra="forbid".
    expect(params.has("view")).toBe(false);
  });

  it("omite offset e limit quando eles valem o vazio combinado (0 e sem teto)", async () => {
    await projectBrowseAPI.browse({
      filters: EMPTY_FILTERS,
      search: "",
      sort: DEFAULT_SORT,
      limit: null,
      offset: 0,
    });
    const params = lastConfig?.params as URLSearchParams;
    expect(params.has("limit")).toBe(false);
    expect(params.has("offset")).toBe(false);
  });

  it("manda offset quando ele é maior que zero", async () => {
    await projectBrowseAPI.browse({
      filters: EMPTY_FILTERS,
      search: "",
      sort: DEFAULT_SORT,
      limit: 30,
      offset: 30,
    });
    const params = lastConfig?.params as URLSearchParams;
    expect(params.get("offset")).toBe("30");
  });
});

describe("o card que a BE-05 devolve, mapeado para o Project local", () => {
  it("traduz os nomes que divergem e preenche o resto com o registro em branco", async () => {
    const result = await projectBrowseAPI.browse({
      filters: EMPTY_FILTERS,
      search: "",
      sort: DEFAULT_SORT,
      limit: null,
      offset: 0,
    });
    const [project] = result.items;
    expect(project.inETEN).toBe(false);
    expect(project.team).toBe("YWAM Aurora");
    expect(project.ywamBase).toBe("YWAM Aurora");
    expect(project.sensitiveCountry).toBe(false);
    expect(project.derived?.region).toBe("south-america");
    // Never on the wire — safe defaults from `createEmptyProject`, not hand-typed here.
    expect(project.prayerRequests).toBe("");
    expect(project.teamContact).toBe("");
    expect(project.regionalCoordinator).toBe("");
    expect(project.progressHistory).toEqual([]);
  });

  it("um status gravado nulo cai para o já inferido pelo servidor, nunca para um valor inventado", async () => {
    const result = await projectBrowseAPI.browse({
      filters: EMPTY_FILTERS,
      search: "",
      sort: DEFAULT_SORT,
      limit: null,
      offset: 0,
    });
    expect(result.items[0].status).toBe("pausado");
  });

  it("uma dimensão de saúde nula vira string vazia, não a string 'null'", async () => {
    const result = await projectBrowseAPI.browse({
      filters: EMPTY_FILTERS,
      search: "",
      sort: DEFAULT_SORT,
      limit: null,
      offset: 0,
    });
    expect(result.items[0].healthEmotional).toBe("");
  });

  it("as necessidades chegam com a categoria e a urgência, sem descrição — o card não a envia", async () => {
    const result = await projectBrowseAPI.browse({
      filters: EMPTY_FILTERS,
      search: "",
      sort: DEFAULT_SORT,
      limit: null,
      offset: 0,
    });
    expect(result.items[0].needsItems).toEqual([
      {
        category: "financial",
        urgency: "high",
        status: "open",
        description: "",
        prayerShared: true,
        prayerAnswered: false,
      },
    ]);
  });
});

describe("as contagens, grupo por grupo", () => {
  it("um grupo fechado que o servidor não citou ainda lê zero, não undefined", async () => {
    const result = await projectBrowseAPI.browse({
      filters: EMPTY_FILTERS,
      search: "",
      sort: DEFAULT_SORT,
      limit: null,
      offset: 0,
    });
    expect(result.counts.health.boa).toBe(0);
    expect(result.counts.health.critica).toBe(0);
    expect(result.counts.eten.yes).toBe(0);
  });

  it("preserva o que o servidor mandou nos grupos esparsos e nos presets", async () => {
    const result = await projectBrowseAPI.browse({
      filters: EMPTY_FILTERS,
      search: "",
      sort: DEFAULT_SORT,
      limit: null,
      offset: 0,
    });
    expect(result.counts.status.pausado).toBe(1);
    expect(result.counts.continent["south-america"]).toBe(1);
    expect(result.counts.preset.prayer).toBe(1);
    expect(result.counts.groupAll.status).toBe(1);
  });

  it("um grupo de facet que o servidor inventou é ignorado, não derruba a leitura (fail closed)", async () => {
    script = () => ({
      status: 200,
      data: {
        ...WIRE_PAGE,
        counts: {
          ...WIRE_PAGE.counts,
          groups: { ...WIRE_PAGE.counts.groups, futureGroup: { x: 3 } },
        },
      },
    });
    const result = await projectBrowseAPI.browse({
      filters: EMPTY_FILTERS,
      search: "",
      sort: DEFAULT_SORT,
      limit: null,
      offset: 0,
    });
    expect(result.counts.status.pausado).toBe(1);
    expect(
      (result.counts as unknown as Record<string, unknown>).futureGroup,
    ).toBeUndefined();
  });
});
