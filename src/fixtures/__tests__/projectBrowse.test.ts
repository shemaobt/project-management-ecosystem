import { describe, expect, it } from "vitest";
import { REGION_CENTROIDS } from "../../constants/geo";
import { DEFAULT_SORT, SORT_KEYS } from "../../constants/sorting";
import { EMPTY_FILTERS } from "../../stores/filtersStore";
import { getRegion } from "../../utils/region";
import { filterProjects } from "../../utils/search";
import { browseProjects, type ProjectBrowseQuery } from "../projectBrowse";
import { loadProjects } from "../projects";

const BASE: ProjectBrowseQuery = {
  filters: EMPTY_FILTERS,
  search: "",
  sort: DEFAULT_SORT,
  limit: null,
  offset: 0,
};

describe("browseProjects — o mesmo que a BE-05 promete, do lado das fixtures", () => {
  it("sem filtro devolve a coleção inteira, e matched === total === 127", async () => {
    const result = await browseProjects(BASE);
    expect(result.total).toBe(127);
    expect(result.matched).toBe(127);
    expect(result.items).toHaveLength(127);
  });

  it("os contadores da contagem são os mesmos que filterProjects produz — uma só passada", async () => {
    const projects = loadProjects();
    const filters = { ...EMPTY_FILTERS, continent: "africa" as const };
    const result = await browseProjects({ ...BASE, filters });
    const direct = filterProjects(projects, filters, "");
    expect(result.matched).toBe(direct.projects.length);
    expect(result.counts).toEqual(direct.counts);
  });

  it("cada projeto devolvido de fato passa no filtro pedido", async () => {
    const filters = { ...EMPTY_FILTERS, status: "em-andamento" as const };
    const result = await browseProjects({ ...BASE, filters });
    for (const project of result.items) {
      expect(project.derived?.status).toBe("em-andamento");
    }
  });

  it("limit e offset cortam a janela sem mexer no total nem no matched", async () => {
    const page1 = await browseProjects({ ...BASE, limit: 10, offset: 0 });
    const page2 = await browseProjects({ ...BASE, limit: 10, offset: 10 });
    expect(page1.items).toHaveLength(10);
    expect(page2.items).toHaveLength(10);
    expect(page1.matched).toBe(127);
    expect(page2.matched).toBe(127);
    const ids1 = page1.items.map((project) => project.id);
    const ids2 = page2.items.map((project) => project.id);
    expect(ids1.some((id) => ids2.includes(id))).toBe(false);
  });

  it.each(SORT_KEYS)("ordena por %s sem perder nenhum projeto", async (sort) => {
    const result = await browseProjects({ ...BASE, sort });
    expect(result.items).toHaveLength(127);
    expect(new Set(result.items.map((project) => project.id)).size).toBe(127);
  });

  it("país sensível chega com localização, base e coordenadas já reduzidas ao centroide", async () => {
    const result = await browseProjects(BASE);
    const flagged = result.items.filter((project) => project.sensitiveCountry);
    expect(flagged.length).toBeGreaterThan(0);
    for (const project of flagged) {
      const region = project.derived?.region;
      expect(region).toBeTruthy();
      expect(project.location).toBe(region);
      expect(project.team).toBe("");
      expect(project.ywamBase).toBe("");
      expect(project.coords).toEqual(REGION_CENTROIDS[region!]);
    }
  });

  it("a região gravada no card sensível é a verdadeira, calculada antes da redação", async () => {
    const project = loadProjects().find(
      (candidate) => candidate.id === "zapoteco-de-santiago-lachirigi",
    );
    if (!project) throw new Error("fixture ausente");
    const trueRegion = getRegion(project);

    const result = await browseProjects(BASE);
    const card = result.items.find(
      (item) => item.id === "zapoteco-de-santiago-lachirigi",
    );
    expect(card?.derived?.region).toBe(trueRegion);
  });

  it("locationsWithheld conta só a janela devolvida, e nunca é 0", async () => {
    const all = await browseProjects(BASE);
    const sensitiveTotal = all.items.filter((p) => p.sensitiveCountry).length;
    expect(all.locationsWithheld).toBe(sensitiveTotal);

    const withoutAny = await browseProjects({
      ...BASE,
      filters: { ...EMPTY_FILTERS, sensitive: "no" },
    });
    expect(withoutAny.locationsWithheld).toBeNull();
  });

  it("os três campos de oração nunca saem daqui, nem para um projeto não sensível", async () => {
    const result = await browseProjects(BASE);
    const withSeed = result.items.find((project) => project.id === "ashaninka");
    expect(withSeed).toBeTruthy();
    for (const project of result.items) {
      expect(project.prayerRequests).toBe("");
      expect(project.prayerVisibility).toBeUndefined();
      expect(project.prayerRequestsAudio).toBeUndefined();
    }
  });

  it("uma busca sem correspondência devolve matched 0 sem quebrar", async () => {
    const result = await browseProjects({
      ...BASE,
      search: "não existe nenhum projeto com este nome",
    });
    expect(result.matched).toBe(0);
    expect(result.items).toHaveLength(0);
  });
});
