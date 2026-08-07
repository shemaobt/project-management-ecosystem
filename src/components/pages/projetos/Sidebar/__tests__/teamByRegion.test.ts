import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { EMPTY_REGION_TEAM } from "../../../../../constants/regions";
import { ROLES } from "../../../../../constants/roles";
import {
  MOCK_SESSION_PERSONAS,
  scopeRegions,
  type SessionPersona,
} from "../../../../../contexts/AuthContext";
import { projectsAPI, regionsAPI } from "../../../../../fixtures";
import { EMPTY_FILTERS } from "../../../../../stores/filtersStore";
import type { Region, RegionKey } from "../../../../../types/region";
import {
  buildRegionPanel,
  holderName,
  orderRegionPanel,
} from "../../../../../utils/region";
import { filterProjects } from "../../../../../utils/search";

const NOW = new Date("2026-05-14T12:00:00Z");
const SCOPED_ROLES = ["coordinator", "obtLab", "resourceCircle"] as const;

function sessionGate(regions: Region[], persona: SessionPersona) {
  const visible = scopeRegions(regions, persona);
  return (key: RegionKey) => visible.some((region) => region.key === key);
}

describe("region panel order", () => {
  it("lists regions by project volume, keeping Europe visible at zero", async () => {
    const projects = await projectsAPI.list();
    expect(orderRegionPanel(projects).map((region) => region.key)).toEqual([
      "oceania",
      "asia",
      "south-america",
      "africa",
      "north-america",
      "other",
      "europe",
    ]);
  });

  it("builds one card per visible region, in panel order", async () => {
    const [projects, regions] = await Promise.all([
      projectsAPI.list(),
      regionsAPI.list(),
    ]);
    const cards = buildRegionPanel(projects, regions, () => true);
    expect(cards.map((card) => card.key)).toEqual(
      orderRegionPanel(projects).map((region) => region.key),
    );
    for (const card of cards) {
      expect(card.labelKey).toMatch(/^continent_/);
    }
  });
});

describe("region counts as a facet", () => {
  it("matches the unfiltered totals when no filter is applied", async () => {
    const projects = await projectsAPI.list();
    const result = filterProjects(projects, EMPTY_FILTERS, "", NOW);
    expect(result.projects).toHaveLength(result.total);
    const shown = Object.values(result.counts.continent).reduce(
      (sum, count) => sum + count,
      0,
    );
    expect(shown).toBe(result.total);
  });

  it("shows exactly the visible count on the active region", async () => {
    const projects = await projectsAPI.list();
    const result = filterProjects(
      projects,
      { ...EMPTY_FILTERS, continent: "africa" },
      "",
      NOW,
    );
    expect(result.counts.continent.africa).toBe(result.projects.length);
    expect(result.projects.length).toBeGreaterThan(0);
  });

  it("stays consistent with Mostrando X de N under another filter", async () => {
    const projects = await projectsAPI.list();
    const result = filterProjects(
      projects,
      { ...EMPTY_FILTERS, health: "critica" },
      "",
      NOW,
    );
    const shown = Object.values(result.counts.continent).reduce(
      (sum, count) => sum + count,
      0,
    );
    expect(shown).toBe(result.projects.length);
  });
});

describe("region visibility follows the mocked session", () => {
  it("shows every region to the global strategist", async () => {
    const [projects, regions] = await Promise.all([
      projectsAPI.list(),
      regionsAPI.list(),
    ]);
    const cards = buildRegionPanel(
      projects,
      regions,
      sessionGate(regions, MOCK_SESSION_PERSONAS.globalStrategist),
    );
    expect(cards).toHaveLength(orderRegionPanel(projects).length);
  });

  it("never discloses another region's card to a scoped role", async () => {
    const [projects, regions] = await Promise.all([
      projectsAPI.list(),
      regionsAPI.list(),
    ]);
    for (const role of SCOPED_ROLES) {
      const persona = MOCK_SESSION_PERSONAS[role];
      const cards = buildRegionPanel(
        projects,
        regions,
        sessionGate(regions, persona),
      );
      expect(cards.map((card) => card.key)).toEqual(persona.regionScope);
    }
  });
});

describe("the panel holds no role-holder of its own", () => {
  it("renders names only through the shared holderName lookup", () => {
    const source = readFileSync(
      join(__dirname, "..", "TeamByRegion.tsx"),
      "utf8",
    );
    expect(source).toContain("buildRegionPanel(projects, regions,");
    expect(source).toContain('holderName(team, role.key) ?? t("sb_no_coordinator")');
    expect(source).not.toMatch(/"[A-ZÀ-Ú][a-zà-ÿ]+ [A-ZÀ-Ú][a-zà-ÿ]+"/);
  });

  it("resolves an unassigned role to the explicit fallback", () => {
    for (const role of ROLES) {
      expect(holderName(EMPTY_REGION_TEAM, role.key)).toBeNull();
    }
    expect(
      holderName(
        { ...EMPTY_REGION_TEAM, coordinator: "Nome Real" },
        "coordinator",
      ),
    ).toBe("Nome Real");
  });

  it("starts every role explicitly unassigned in the org chart", async () => {
    const regions = await regionsAPI.list();
    for (const region of regions) {
      expect(region.team).toEqual({
        coordinator: "",
        obtLab: "",
        resourceCircle: "",
      });
    }
  });
});
