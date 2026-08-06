import { describe, expect, it } from "vitest";
import { regionsAPI } from "../../fixtures";
import {
  MOCK_SESSION_PERSONAS,
  resolvePersonaName,
  scopeRegions,
} from "../AuthContext";

const SCOPED_ROLES = ["coordinator", "obtLab", "resourceCircle"] as const;

describe("mocked session", () => {
  it("gives the global strategist every region", async () => {
    const regions = await regionsAPI.list();
    const visible = scopeRegions(
      regions,
      MOCK_SESSION_PERSONAS.globalStrategist,
    );
    expect(visible).toHaveLength(regions.length);
    expect(visible.length).toBeGreaterThan(1);
  });

  it("gives a scoped role fewer regions than the global strategist", async () => {
    const regions = await regionsAPI.list();
    const global = scopeRegions(regions, MOCK_SESSION_PERSONAS.globalStrategist);
    for (const role of SCOPED_ROLES) {
      const scoped = scopeRegions(regions, MOCK_SESSION_PERSONAS[role]);
      expect(scoped.length).toBeGreaterThan(0);
      expect(scoped.length).toBeLessThan(global.length);
    }
  });

  it("only resolves regions inside the user's scope", async () => {
    const regions = await regionsAPI.list();
    for (const role of SCOPED_ROLES) {
      const persona = MOCK_SESSION_PERSONAS[role];
      const scoped = scopeRegions(regions, persona);
      expect(scoped.map((region) => region.key)).toEqual(persona.regionScope);
    }
  });

  it("names the global strategist after the prototype's current user", async () => {
    const regions = await regionsAPI.list();
    expect(
      resolvePersonaName(MOCK_SESSION_PERSONAS.globalStrategist, regions),
    ).toBe("Karina Marinho");
  });

  it("claims no role-holder while the org chart is empty", async () => {
    const regions = await regionsAPI.list();
    for (const role of SCOPED_ROLES) {
      expect(resolvePersonaName(MOCK_SESSION_PERSONAS[role], regions)).toBe(
        "— a definir",
      );
    }
  });

  it("resolves the persona name from the org chart once it is filled", async () => {
    const regions = await regionsAPI.list();
    const filled = regions.map((region) =>
      region.key === "south-america"
        ? { ...region, team: { ...region.team, coordinator: "Nome Real" } }
        : region,
    );
    expect(resolvePersonaName(MOCK_SESSION_PERSONAS.coordinator, filled)).toBe(
      "Nome Real",
    );
  });
});
