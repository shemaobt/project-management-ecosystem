import axios, { type InternalAxiosRequestConfig } from "axios";
import { describe, expect, it, vi } from "vitest";

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

const calls: { path: string; params: string }[] = [];
const adapter = async (config: InternalAxiosRequestConfig) => {
  calls.push({ path: config.url ?? "", params: String(config.params ?? "") });
  return {
    data: { items: [CARD], counts: { groups: {}, presets: {}, groupAll: {} }, matched: 1, total: 1, locationsWithheld: 1 },
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

describe("a lista inteira contra o servidor", () => {
  it("vem da busca do servidor, sem filtro e sem página", async () => {
    await useProjectsStore.getState().hydrate();

    expect(calls.map((call) => call.path)).toEqual(["/shema/projects"]);
    expect(calls[0]?.params).not.toContain("limit");
    expect(useProjectsStore.getState().projects.map((project) => project.id)).toEqual([
      "op-7f3a",
    ]);
  });

  it("nada dela fica guardado no navegador", () => {
    expect(storage.raw.get("shema-projects-v1") ?? "").not.toContain("op-7f3a");
  });
});
