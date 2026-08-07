import { describe, expect, it } from "vitest";
import { REGION_CENTROIDS } from "../../../../../constants/geo";
import { projectsAPI } from "../../../../../fixtures";
import {
  EMPTY_FILTERS,
  type ProjectFilters,
} from "../../../../../stores/filtersStore";
import { makeProject } from "../../../../../utils/__tests__/factory";
import {
  getLocationDisplay,
  getMapPlacement,
  getRegion,
} from "../../../../../utils/region";
import { filterProjects } from "../../../../../utils/search";
import {
  buildMarkerSources,
  buildNightStats,
  countWithheld,
  markerRadius,
} from "../markers";
import { orthoProject, spreadOverlapping } from "../projection";

const NOW = new Date("2026-05-14T12:00:00");

describe("Atlas e lista renderizam o mesmo conjunto", () => {
  const scenarios: { name: string; filters: ProjectFilters; search: string }[] =
    [
      { name: "sem filtros", filters: { ...EMPTY_FILTERS }, search: "" },
      {
        name: "continente",
        filters: { ...EMPTY_FILTERS, continent: "asia" },
        search: "",
      },
      {
        name: "preset atenção",
        filters: { ...EMPTY_FILTERS, attention: true },
        search: "",
      },
      {
        name: "país sensível",
        filters: { ...EMPTY_FILTERS, sensitive: "yes" },
        search: "",
      },
      { name: "busca", filters: { ...EMPTY_FILTERS }, search: "Waima" },
    ];

  for (const scenario of scenarios) {
    it(`plota exatamente o que os filtros retornam (${scenario.name})`, async () => {
      const all = await projectsAPI.list();
      const result = filterProjects(all, scenario.filters, scenario.search, NOW);
      const sources = buildMarkerSources(result.projects);
      expect(sources.map((source) => source.project.id)).toEqual(
        result.projects.map((project) => project.id),
      );
    });
  }

  it("os cenários exercitam conjuntos não vazios e menores que o total", async () => {
    const all = await projectsAPI.list();
    for (const scenario of scenarios) {
      const result = filterProjects(all, scenario.filters, scenario.search, NOW);
      expect(result.projects.length).toBeGreaterThan(0);
      if (scenario.name !== "sem filtros") {
        expect(result.projects.length).toBeLessThan(all.length);
      }
    }
  });
});

describe("país sensível nunca aparece em precisão total", () => {
  it("as fixtures marcadas plotam no centroide da região, nunca nas coordenadas reais", async () => {
    const all = await projectsAPI.list();
    const sensitive = all.filter((project) => project.sensitiveCountry);
    expect(sensitive.length).toBeGreaterThan(0);
    for (const project of sensitive) {
      const placement = getMapPlacement(project);
      expect(placement?.precision).toBe("region");
      expect(placement?.coords).toEqual(REGION_CENTROIDS[getRegion(project)]);
      expect(placement?.coords).not.toEqual(project.coords);
    }
  });

  it("varredura completa: todo marcador sensível é aproximado, todo aberto é exato", async () => {
    const all = await projectsAPI.list();
    const sources = buildMarkerSources(all);
    for (const source of sources) {
      if (source.project.sensitiveCountry) {
        expect(source.placement.precision).toBe("region");
        expect(source.placement.coords).not.toEqual(source.project.coords);
      } else {
        expect(source.placement.precision).toBe("exact");
        expect(source.placement.coords).toEqual(source.project.coords);
      }
    }
  });

  it("vale para um projeto sensível recém-criado, mesmo sem país mapeado", () => {
    const brazilian = makeProject({
      sensitiveCountry: true,
      location: "Brazil",
      coords: [-53, -10],
    });
    expect(getMapPlacement(brazilian)).toEqual({
      coords: REGION_CENTROIDS["south-america"],
      precision: "region",
    });

    const unmapped = makeProject({
      sensitiveCountry: true,
      location: "",
      coords: [30, 27],
    });
    expect(getMapPlacement(unmapped)).toEqual({
      coords: REGION_CENTROIDS.other,
      precision: "region",
    });
  });

  it("o cartão mostra a região no lugar do local para projeto sensível", async () => {
    const all = await projectsAPI.list();
    for (const project of all) {
      const display = getLocationDisplay(project);
      if (project.sensitiveCountry) {
        expect(display).toEqual({
          withheld: true,
          regionLabelKey: expect.stringMatching(/^continent_/) as string,
        });
      } else {
        expect(display).toEqual({ withheld: false, location: project.location });
      }
    }
  });

  it("o aviso conta exatamente os marcadores aproximados do conjunto filtrado", async () => {
    const all = await projectsAPI.list();
    const result = filterProjects(all, { ...EMPTY_FILTERS }, "", NOW);
    const sources = buildMarkerSources(result.projects);
    expect(countWithheld(sources)).toBe(
      result.projects.filter((project) => project.sensitiveCountry).length,
    );
  });
});

describe("agrupamento de marcadores sobrepostos", () => {
  it("separa pontos empilhados preservando todos e sem mutar a entrada", () => {
    const points = [
      { id: "a", x: 100, y: 100 },
      { id: "b", x: 101, y: 101 },
      { id: "c", x: 300, y: 300 },
    ];
    const spread = spreadOverlapping(points);
    expect(spread).toHaveLength(3);
    const [a, b, c] = spread;
    expect(a.x !== b.x || a.y !== b.y).toBe(true);
    expect(c).toEqual({ id: "c", x: 300, y: 300 });
    expect(points[0]).toEqual({ id: "a", x: 100, y: 100 });
  });

  it("não move pontos que já estão isolados", () => {
    const points = [
      { x: 0, y: 0 },
      { x: 50, y: 50 },
    ];
    expect(spreadOverlapping(points)).toEqual(points);
  });
});

describe("derivações do globo", () => {
  it("estatísticas noturnas: total, ativos e regiões distintas", () => {
    const projects = [
      makeProject({ id: "a", location: "Brazil" }),
      makeProject({ id: "b", location: "Peru", status: "concluido" }),
      makeProject({
        id: "c",
        location: "Brazil",
        status: "final",
        totalUnits: 100,
        translatedUnits: 80,
      }),
      makeProject({ id: "d", location: "", status: "pausado" }),
    ];
    expect(buildNightStats(projects)).toEqual({
      total: 4,
      inProgress: 2,
      regions: 2,
    });
  });

  it("raio do marcador segue a escala de falantes do protótipo", () => {
    expect(markerRadius(makeProject({ speakerCount: "" }))).toBe(4.2);
    expect(markerRadius(makeProject({ speakerCount: "15000" }))).toBe(4.8);
    expect(markerRadius(makeProject({ speakerCount: "150000" }))).toBe(5.5);
  });

  it("projeção ortográfica: frente e verso da esfera", () => {
    const front = orthoProject(0, 0, 0, 0);
    expect(front.x).toBeCloseTo(0);
    expect(front.y).toBeCloseTo(0);
    expect(front.z).toBeCloseTo(1);
    expect(orthoProject(180, 0, 0, 0).z).toBeCloseTo(-1);
    expect(orthoProject(90, 0, 0, 0).x).toBeCloseTo(1);
  });
});
