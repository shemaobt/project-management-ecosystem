import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { ProjectFilters } from "../../../../../../stores/filtersStore";
import type { Project } from "../../../../../../types/project";

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

const { projectsAPI } = await import("../../../../../../fixtures");
const { EMPTY_FILTERS, useFiltersStore } = await import(
  "../../../../../../stores/filtersStore"
);
const { filterProjects } = await import("../../../../../../utils/search");
const {
  ADVANCED_SECTIONS,
  PRIMARY_SECTIONS,
  VITALITY_SCALE,
  buildFilterOptions,
  getOptionCount,
  resolveSectionOptions,
} = await import("../sections");

const NOW = new Date("2026-05-14T00:00:00");

const ALL_SECTIONS = [...PRIMARY_SECTIONS, ...ADVANCED_SECTIONS];
const SECTION_IDS = ALL_SECTIONS.map((section) => section.id);

const withFilters = (overrides: Partial<ProjectFilters>): ProjectFilters => ({
  ...EMPTY_FILTERS,
  ...overrides,
});

describe("detailed filters", () => {
  let projects: Project[];
  let options: ReturnType<typeof buildFilterOptions>;

  beforeAll(async () => {
    projects = await projectsAPI.list();
    options = buildFilterOptions(projects, NOW);
  });

  beforeEach(() => {
    storage.clear();
    useFiltersStore.setState({ filters: { ...EMPTY_FILTERS }, search: "" });
  });

  it("splits the groups exactly as the prototype does", () => {
    expect(PRIMARY_SECTIONS.map((section) => section.id)).toEqual([
      "status",
      "team",
      "health",
    ]);
    expect(ADVANCED_SECTIONS.map((section) => section.id)).toEqual([
      "country",
      "objective",
      "translationType",
      "eten",
      "sensitive",
      "financial",
      "progressRange",
      "vitality",
      "needCategory",
      "hasMedia",
      "stale",
    ]);
  });

  it.each(SECTION_IDS)(
    "selecting each %s option returns exactly the count it promised",
    (sectionId) => {
      const promised = filterProjects(projects, EMPTY_FILTERS, "", NOW).counts;
      expect(options[sectionId].length).toBeGreaterThan(0);
      for (const spec of options[sectionId]) {
        useFiltersStore.setState({ filters: { ...EMPTY_FILTERS }, search: "" });
        useFiltersStore.getState().setFilter(sectionId, spec.value);
        const { filters, search } = useFiltersStore.getState();
        const applied = filterProjects(projects, filters, search, NOW);
        expect(
          applied.projects.length,
          `${sectionId}:${spec.value}`,
        ).toBe(getOptionCount(promised, sectionId, spec.value));
      }
    },
  );

  it.each(SECTION_IDS)(
    "keeps %s counts honest combined with search, chips and region",
    (sectionId) => {
      const base = withFilters({
        continent: "south-america",
        recent: true,
      });
      const search = "a";
      const scoped = filterProjects(projects, base, search, NOW);
      expect(scoped.projects.length).toBeGreaterThan(0);
      for (const spec of options[sectionId]) {
        const applied = filterProjects(
          projects,
          { ...base, [sectionId]: spec.value },
          search,
          NOW,
        );
        expect(
          applied.projects.length,
          `${sectionId}:${spec.value}`,
        ).toBe(getOptionCount(scoped.counts, sectionId, spec.value));
      }
    },
  );

  it.each(SECTION_IDS)(
    "promises on the %s Todos chip exactly what clearing the group returns",
    (sectionId) => {
      const selected = options[sectionId][0];
      const base = withFilters({
        continent: "africa",
        [sectionId]: selected.value,
      });
      const counts = filterProjects(projects, base, "", NOW).counts;
      const cleared = filterProjects(
        projects,
        { ...base, [sectionId]: null },
        "",
        NOW,
      );
      expect(counts.groupAll[sectionId]).toBe(cleared.projects.length);
    },
  );

  it("keeps the whole vitality scale listed even with no data behind it", () => {
    expect(options.vitality).toEqual(VITALITY_SCALE);
    const counts = filterProjects(projects, EMPTY_FILTERS, "", NOW).counts;
    for (const spec of options.vitality) {
      expect(getOptionCount(counts, "vitality", spec.value)).toBe(0);
    }
  });

  it("keeps zero-count options rendered, locked but visible", () => {
    const countrySection = ADVANCED_SECTIONS.find(
      (section) => section.id === "country",
    );
    if (!countrySection) throw new Error("country section missing");
    const narrowed = filterProjects(
      projects,
      withFilters({ continent: "asia" }),
      "",
      NOW,
    ).counts;
    const rendered = resolveSectionOptions(
      countrySection,
      options,
      narrowed,
      null,
    );
    expect(rendered.map((option) => option.value)).toEqual(
      options.country.map((spec) => spec.value),
    );
    const zeroed = rendered.filter((option) => option.count === 0);
    expect(zeroed.length).toBeGreaterThan(0);
    for (const option of zeroed) {
      expect(option.locked).toBe(true);
    }
    for (const option of rendered.filter((option) => option.count > 0)) {
      expect(option.locked).toBe(false);
    }
  });

  it("keeps an active zero-count option clickable", () => {
    const countrySection = ADVANCED_SECTIONS.find(
      (section) => section.id === "country",
    );
    if (!countrySection) throw new Error("country section missing");
    const narrowed = filterProjects(
      projects,
      withFilters({ continent: "asia" }),
      "",
      NOW,
    ).counts;
    const zeroValue = options.country.find(
      (spec) => getOptionCount(narrowed, "country", spec.value) === 0,
    );
    if (!zeroValue) throw new Error("no zero-count country under asia");
    const rendered = resolveSectionOptions(
      countrySection,
      options,
      narrowed,
      zeroValue.value,
    );
    const active = rendered.find((option) => option.value === zeroValue.value);
    expect(active?.locked).toBe(false);
  });

  it("marks the prototype's three critical options and no others", () => {
    const counts = filterProjects(projects, EMPTY_FILTERS, "", NOW).counts;
    const critical = ALL_SECTIONS.flatMap((section) =>
      resolveSectionOptions(section, options, counts, null)
        .filter((option) => option.critical)
        .map((option) => `${section.id}:${option.value}`),
    );
    expect(critical.sort()).toEqual([
      "health:critica",
      "stale:critico",
      "status:cancelado",
    ]);
  });

  it("labels the range groups as ordered buckets", () => {
    expect(options.progressRange.map((spec) => spec.value)).toEqual([
      "0-25",
      "25-50",
      "50-75",
      "75-100",
    ]);
    expect(options.vitality.map((spec) => spec.value)).toEqual([
      "Vital",
      "Vulnerável",
      "Ameaçada",
      "Seriamente ameaçada",
      "Em situação crítica",
      "Extinta",
    ]);
    for (const spec of [...options.progressRange, ...options.vitality]) {
      expect(spec.labelKey).toBeTruthy();
    }
  });

  it("clears every detailed group with Clear all", () => {
    const store = useFiltersStore.getState();
    store.setFilter("status", "em-andamento");
    store.setFilter("team", options.team[0].value);
    store.setFilter("eten", "yes");
    store.setFilter("progressRange", "0-25");
    store.setSearch("kalimantan");
    useFiltersStore.getState().clearAll();
    expect(useFiltersStore.getState().filters).toEqual(EMPTY_FILTERS);
    expect(useFiltersStore.getState().search).toBe("");
  });

  it("keeps the option universe stable regardless of the active filters", () => {
    const rebuilt = buildFilterOptions(projects, NOW);
    expect(rebuilt).toEqual(options);
  });
});
