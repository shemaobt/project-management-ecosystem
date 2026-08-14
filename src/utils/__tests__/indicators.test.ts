import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { loadRawProjects } from "../../fixtures/projects";
import { EMPTY_FILTERS } from "../../stores/filtersStore";
import { decodeView } from "../filterSerialisation";
import {
  INDICATORS,
  indicatorCount,
  indicatorHref,
  type IndicatorSpec,
} from "../indicators";
import { matchesPreset } from "../presets";
import { getStaleStatus, isNoNews, staleFilterMatches } from "../recency";
import { filterProjects } from "../search";
import { makeProject } from "./factory";

const NOW = new Date("2026-05-14T00:00:00");

const pad = (value: number): string => String(value).padStart(2, "0");

const daysBefore = (days: number): string => {
  const date = new Date(NOW);
  date.setDate(date.getDate() - days);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

const atDays = (days: number) =>
  makeProject({
    startDate: daysBefore(days),
    lastUpdated: daysBefore(days),
  });

const specById = (id: IndicatorSpec["id"]): IndicatorSpec => {
  const spec = INDICATORS.find((candidate) => candidate.id === id);
  if (!spec) throw new Error(`indicador desconhecido: ${id}`);
  return spec;
};

describe("indicadores ↔ destino", () => {
  const projects = loadRawProjects();

  it("cada indicador filtrado conta exatamente o que o link devolve", () => {
    for (const spec of INDICATORS) {
      if (spec.filters === null) continue;
      const href = indicatorHref(spec);
      const query = href.includes("?") ? href.slice(href.indexOf("?") + 1) : "";
      const decoded = decodeView(new URLSearchParams(query));
      const shown = filterProjects(
        projects,
        decoded.filters,
        decoded.search,
        NOW,
      ).projects.length;
      expect(indicatorCount(spec, projects, NOW), spec.id).toBe(shown);
    }
  });

  it("todo link aterrissa na lista de projetos", () => {
    for (const spec of INDICATORS) {
      expect(indicatorHref(spec).startsWith("/projetos")).toBe(true);
    }
  });

  it("bases conta equipes distintas, não projetos", () => {
    const shared = [
      makeProject({ team: "JOCUM Belém" }),
      makeProject({ team: "JOCUM Belém" }),
      makeProject({ team: "JOCUM Recife" }),
      makeProject({ team: "" }),
    ];
    expect(indicatorCount(specById("bases"), shared, NOW)).toBe(2);
  });
});

describe("regra dos 60 dias — indicador e chip nunca divergem", () => {
  it("classifica o mesmo projeto identicamente em cada fronteira", () => {
    const noNews = specById("noNews");
    const cases = [
      { days: 29, counted: false, recent: true },
      { days: 30, counted: false, recent: true },
      { days: 31, counted: false, recent: false },
      { days: 59, counted: false, recent: false },
      { days: 60, counted: true, recent: false },
      { days: 61, counted: true, recent: false },
      { days: 119, counted: true, recent: false },
      { days: 120, counted: true, recent: false },
    ];
    for (const { days, counted, recent } of cases) {
      const project = atDays(days);
      expect(isNoNews(getStaleStatus(project, NOW)), `dias=${days}`).toBe(
        counted,
      );
      expect(indicatorCount(noNews, [project], NOW), `dias=${days}`).toBe(
        counted ? 1 : 0,
      );
      expect(matchesPreset(project, "recent", NOW), `dias=${days}`).toBe(
        recent,
      );
      expect(counted && recent, `dias=${days}`).toBe(false);
    }
  });

  it("um projeto que não pode ficar desatualizado nunca entra no indicador", () => {
    const done = makeProject({
      status: "concluido",
      startDate: daysBefore(200),
      lastUpdated: daysBefore(200),
    });
    expect(getStaleStatus(done, NOW)).toBeNull();
    expect(indicatorCount(specById("noNews"), [done], NOW)).toBe(0);
  });
});

describe("filtro sem notícias — o rótulo manda", () => {
  it("stale=atencao alcança também os projetos críticos", () => {
    const critico = atDays(150);
    const result = filterProjects(
      [critico],
      { ...EMPTY_FILTERS, stale: "atencao" },
      "",
      NOW,
    );
    expect(result.projects).toHaveLength(1);
    expect(result.counts.stale.atencao).toBe(1);
    expect(result.counts.stale.critico).toBe(1);
  });

  it("em-dia e critico continuam exatos", () => {
    expect(staleFilterMatches("critico", "em-dia")).toBe(false);
    expect(staleFilterMatches("atencao", "em-dia")).toBe(false);
    expect(staleFilterMatches("em-dia", "em-dia")).toBe(true);
    expect(staleFilterMatches("atencao", "critico")).toBe(false);
    expect(staleFilterMatches("critico", "critico")).toBe(true);
    expect(staleFilterMatches(null, "atencao")).toBe(false);
  });
});

describe("nenhuma figura de amostra do PRD vira literal", () => {
  const sources = [
    "src/utils/indicators.ts",
    "src/components/pages/HomePage/index.tsx",
    "src/components/pages/HomePage/Hero.tsx",
    "src/components/pages/HomePage/IndicatorBand.tsx",
  ];

  it.each(sources)("%s", (file) => {
    const source = readFileSync(join(process.cwd(), file), "utf8");
    expect(source).not.toMatch(/\b(?:127|73|21)\b/);
  });
});
