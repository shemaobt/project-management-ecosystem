import { beforeAll, describe, expect, it } from "vitest";
import { projectsAPI } from "../../fixtures";
import { EMPTY_FILTERS, type ProjectFilters } from "../../stores/filtersStore";
import type { PresetId, Project, ProjectStatus } from "../../types/project";
import { filterProjects, matchesSearch, normalizeSearchText } from "../search";
import { makeProject } from "./factory";

const NOW = new Date("2026-05-14T00:00:00");

const withFilters = (overrides: Partial<ProjectFilters>): ProjectFilters => ({
  ...EMPTY_FILTERS,
  ...overrides,
});

describe("normalizeSearchText", () => {
  it("lowercases and strips diacritics", () => {
    expect(normalizeSearchText("Ngäbere")).toBe("ngabere");
    expect(normalizeSearchText("Apinayé")).toBe("apinaye");
    expect(normalizeSearchText("Sãotomense")).toBe("saotomense");
  });

  it("folds curly apostrophes into straight ones", () => {
    expect(normalizeSearchText("Waima’a")).toBe("waima'a");
  });

  it("folds non-breaking and repeated spaces into a single space", () => {
    expect(normalizeSearchText("Embera\u00A0Dobida")).toBe("embera dobida");
    expect(normalizeSearchText("Embera   Dobida")).toBe("embera dobida");
  });

  it("lowercases independently of the host locale", () => {
    expect(normalizeSearchText("Idate")).toBe("idate");
    expect(normalizeSearchText("İstanbul")).toBe("istanbul");
  });

  it("keeps non-Latin scripts intact", () => {
    expect(normalizeSearchText("שמע")).toBe("שמע");
  });
});

describe("matchesSearch", () => {
  it("matches the language name regardless of case and accents", () => {
    const project = makeProject({ languageName: "Ngäbere" });
    expect(matchesSearch(project, "NGÄBERE")).toBe(true);
    expect(matchesSearch(project, "ngabere")).toBe(true);
    expect(matchesSearch(project, "gäbe")).toBe(true);
  });

  it("matches accented input against a plain name", () => {
    const project = makeProject({ languageName: "Apinaye" });
    expect(matchesSearch(project, "Apinayé")).toBe(true);
  });

  it("matches the base fields", () => {
    expect(
      matchesSearch(makeProject({ team: "YWAM Aurora" }), "aurora"),
    ).toBe(true);
    expect(
      matchesSearch(makeProject({ ywamBase: "YWAM Porto Velho" }), "porto"),
    ).toBe(true);
  });

  it("matches the partner org", () => {
    expect(
      matchesSearch(makeProject({ partnerOrg: "Seed Company" }), "seed"),
    ).toBe(true);
  });

  it("does not match fields outside language, base and partner", () => {
    const project = makeProject({ location: "Brasil, Rondônia" });
    expect(matchesSearch(project, "brasil")).toBe(false);
  });

  it("matches everything when the query is blank", () => {
    expect(matchesSearch(makeProject(), "   ")).toBe(true);
  });
});

describe("filterProjects over the fixtures", () => {
  let projects: Project[];

  beforeAll(async () => {
    projects = await projectsAPI.list();
  });

  it("returns every project when nothing is filtered", () => {
    const result = filterProjects(projects, EMPTY_FILTERS, "", NOW);
    expect(result.total).toBe(projects.length);
    expect(result.projects.length).toBe(projects.length);
  });

  it("finds Waima’a typed with a straight apostrophe", () => {
    const result = filterProjects(projects, EMPTY_FILTERS, "waima'a", NOW);
    expect(result.projects.map((project) => project.id)).toContain("waima-a");
  });

  it("finds Ngäbere typed without the umlaut", () => {
    const result = filterProjects(projects, EMPTY_FILTERS, "ngabere", NOW);
    expect(result.projects.map((project) => project.id)).toContain("ngabere");
  });

  it("finds Embera Dobida typed with a regular space", () => {
    const result = filterProjects(projects, EMPTY_FILTERS, "embera dobida", NOW);
    expect(result.projects.map((project) => project.id)).toContain(
      "embera-dobida",
    );
  });

  it("narrows as the query grows and never invents matches", () => {
    for (const query of ["ywam", "ngä", "zzz-nada"]) {
      const result = filterProjects(projects, EMPTY_FILTERS, query, NOW);
      const expected = projects.filter((project) =>
        matchesSearch(project, query),
      );
      expect(result.projects.map((project) => project.id)).toEqual(
        expected.map((project) => project.id),
      );
    }
  });

  it("reads the project list in a single pass", () => {
    const reads = new Map<string, number>();
    const proxied = new Proxy(projects, {
      get(target, property, receiver) {
        if (typeof property === "string" && /^\d+$/.test(property)) {
          reads.set(property, (reads.get(property) ?? 0) + 1);
        }
        return Reflect.get(target, property, receiver);
      },
    });
    filterProjects(proxied, withFilters({ status: "em-andamento" }), "a", NOW);
    expect(reads.size).toBe(projects.length);
    for (const count of reads.values()) {
      expect(count).toBe(1);
    }
  });

  it("keeps every status count honest under no other filters", () => {
    const base = filterProjects(projects, EMPTY_FILTERS, "", NOW);
    for (const [status, count] of Object.entries(base.counts.status)) {
      const applied = filterProjects(
        projects,
        withFilters({ status: status as ProjectStatus }),
        "",
        NOW,
      );
      expect(applied.projects.length).toBe(count);
    }
  });

  it("keeps team counts honest under an active search", () => {
    const searched = filterProjects(projects, EMPTY_FILTERS, "ywam", NOW);
    for (const [team, count] of Object.entries(searched.counts.team)) {
      const applied = filterProjects(
        projects,
        withFilters({ team }),
        "ywam",
        NOW,
      );
      expect(applied.projects.length).toBe(count);
    }
  });

  it("keeps preset counts honest, combined with other presets", () => {
    const base = filterProjects(projects, EMPTY_FILTERS, "", NOW);
    for (const preset of [
      "attention",
      "prayer",
      "celebrate",
      "recent",
    ] as PresetId[]) {
      const applied = filterProjects(
        projects,
        withFilters({ [preset]: true }),
        "",
        NOW,
      );
      expect(applied.projects.length).toBe(base.counts.preset[preset]);
    }
    const withAttention = filterProjects(
      projects,
      withFilters({ attention: true }),
      "",
      NOW,
    );
    const both = filterProjects(
      projects,
      withFilters({ attention: true, prayer: true }),
      "",
      NOW,
    );
    expect(both.projects.length).toBe(withAttention.counts.preset.prayer);
  });

  it("keeps sibling options honest while one option of the facet is active", () => {
    const active = filterProjects(
      projects,
      withFilters({ status: "em-andamento" }),
      "",
      NOW,
    );
    const base = filterProjects(projects, EMPTY_FILTERS, "", NOW);
    expect(active.counts.status).toEqual(base.counts.status);
    const switched = filterProjects(
      projects,
      withFilters({ status: "concluido" }),
      "",
      NOW,
    );
    expect(switched.projects.length).toBe(active.counts.status.concluido ?? 0);
  });

  it("counts continents for the whole scope like the prototype", () => {
    const base = filterProjects(projects, EMPTY_FILTERS, "", NOW);
    const totalByContinent = Object.values(base.counts.continent).reduce(
      (sum, count) => sum + count,
      0,
    );
    expect(totalByContinent).toBe(projects.length);
  });
});

describe("filterProjects when a project repeats a facet value", () => {
  it("still counts what a click returns, one per project", () => {
    const doubled = makeProject({
      objective: ["NT", "NT"],
      financialResources: ["Seed Company", "Seed Company"],
      translationType: ["OBT", "OBT"],
      needsItems: [
        {
          category: "financial",
          urgency: "high",
          status: "open",
          description: "salary gap",
        },
        {
          category: "financial",
          urgency: "low",
          status: "open",
          description: "travel",
        },
      ],
    });
    const base = filterProjects([doubled], EMPTY_FILTERS, "", NOW);
    expect(base.counts.objective.NT).toBe(1);
    expect(base.counts.financial["Seed Company"]).toBe(1);
    expect(base.counts.translationType.OBT).toBe(1);
    expect(base.counts.needCategory.financial).toBe(1);
    const clicked = filterProjects(
      [doubled],
      withFilters({ needCategory: "financial" }),
      "",
      NOW,
    );
    expect(clicked.projects.length).toBe(base.counts.needCategory.financial);
  });
});
