import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { ProjectFilters } from "../../../../../stores/filtersStore";
import type { PresetId, Project } from "../../../../../types/project";

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
const { EMPTY_FILTERS, useFiltersStore } = await import(
  "../../../../../stores/filtersStore"
);
const { matchesPreset } = await import("../../../../../utils/presets");
const { getProjectStatus } = await import("../../../../../utils/progress");
const { filterProjects, matchesSearch } = await import(
  "../../../../../utils/search"
);

const NOW = new Date("2026-05-14T00:00:00");

const PRESET_IDS: readonly PresetId[] = [
  "attention",
  "prayer",
  "celebrate",
  "recent",
];

const withFilters = (overrides: Partial<ProjectFilters>): ProjectFilters => ({
  ...EMPTY_FILTERS,
  ...overrides,
});

describe("preset chips", () => {
  let projects: Project[];

  beforeAll(async () => {
    projects = await projectsAPI.list();
  });

  beforeEach(() => {
    storage.clear();
    useFiltersStore.setState({ filters: { ...EMPTY_FILTERS }, search: "" });
  });

  it.each(PRESET_IDS)(
    "selecting %s returns exactly the count its chip promised",
    (preset) => {
      const promised = filterProjects(projects, EMPTY_FILTERS, "", NOW).counts
        .preset[preset];
      useFiltersStore.getState().togglePreset(preset);
      const { filters, search } = useFiltersStore.getState();
      const applied = filterProjects(projects, filters, search, NOW);
      expect(applied.projects.length).toBe(promised);
      for (const project of applied.projects) {
        expect(matchesPreset(project, preset, NOW)).toBe(true);
      }
    },
  );

  it.each(PRESET_IDS)(
    "keeps the %s count honest under search and detailed filters",
    (preset) => {
      const filters = withFilters({
        status: "em-andamento",
        continent: "south-america",
      });
      const promised = filterProjects(projects, filters, "ywam", NOW).counts
        .preset[preset];
      const applied = filterProjects(
        projects,
        { ...filters, [preset]: true },
        "ywam",
        NOW,
      );
      expect(applied.projects.length).toBe(promised);
    },
  );

  it("combines chips with AND — the second chip narrows to its promised count", () => {
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
    for (const project of both.projects) {
      expect(matchesPreset(project, "attention", NOW)).toBe(true);
      expect(matchesPreset(project, "prayer", NOW)).toBe(true);
    }
  });

  it("ANDs an active chip with search and the other filter groups", () => {
    const store = useFiltersStore.getState();
    store.setSearch("ywam");
    store.setFilter("status", "em-andamento");
    store.togglePreset("attention");
    const { filters, search } = useFiltersStore.getState();
    const applied = filterProjects(projects, filters, search, NOW);
    expect(applied.projects.length).toBe(
      filterProjects(projects, { ...filters, attention: false }, search, NOW)
        .counts.preset.attention,
    );
    for (const project of applied.projects) {
      expect(matchesSearch(project, search)).toBe(true);
      expect(getProjectStatus(project)).toBe("em-andamento");
      expect(matchesPreset(project, "attention", NOW)).toBe(true);
    }
  });

  it("clear all resets chips, search and detailed filters in one action", () => {
    const store = useFiltersStore.getState();
    store.togglePreset("attention");
    store.togglePreset("recent");
    store.setSearch("ywam");
    store.setFilter("continent", "africa");
    store.setFilter("health", "critica");
    useFiltersStore.getState().clearAll();
    const { filters, search } = useFiltersStore.getState();
    expect(filters).toEqual(EMPTY_FILTERS);
    expect(search).toBe("");
    expect(filterProjects(projects, filters, search, NOW).projects.length).toBe(
      projects.length,
    );
  });
});
