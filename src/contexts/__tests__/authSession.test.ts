import { describe, expect, it } from "vitest";
import { ROLES } from "../../constants/roles";
import { regionsAPI } from "../../fixtures";
import en from "../../i18n/locales/en.json";
import ptBR from "../../i18n/locales/pt-BR.json";
import {
  MOCK_SESSION_PERSONAS,
  SESSION_ROLE_LABEL_KEYS,
  UNASSIGNED_HOLDER_KEY,
  resolvePersonaName,
  scopeRegions,
} from "../AuthContext";

const SCOPED_ROLES = ["coordinator", "obtLab", "resourceCircle"] as const;

const SESSION_ROLES = Object.values(MOCK_SESSION_PERSONAS).map(
  (persona) => persona.role,
);

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
      expect(
        resolvePersonaName(MOCK_SESSION_PERSONAS[role], regions),
      ).toBeNull();
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

describe("session role vocabulary", () => {
  it("names every persona with a key both catalogues carry", () => {
    for (const role of SESSION_ROLES) {
      const key = SESSION_ROLE_LABEL_KEYS[role];
      expect(Object.keys(ptBR), role).toContain(key);
      expect(Object.keys(en), role).toContain(key);
    }
  });

  it("takes the field-role labels from the org chart, never a second copy", () => {
    for (const role of ROLES) {
      expect(SESSION_ROLE_LABEL_KEYS[role.key]).toBe(role.labelKey);
    }
  });

  it("says 'no holder yet' through the catalogue in both languages", () => {
    expect(Object.keys(ptBR)).toContain(UNASSIGNED_HOLDER_KEY);
    expect(en[UNASSIGNED_HOLDER_KEY]).not.toBe(ptBR[UNASSIGNED_HOLDER_KEY]);
  });
});
