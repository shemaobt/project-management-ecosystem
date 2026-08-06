import { describe, expect, it } from "vitest";
import { regionsAPI } from "../../fixtures";
import { MOCK_SESSION_USERS, scopeRegions } from "../AuthContext";

const SCOPED_ROLES = ["coordinator", "obtLab", "resourceCircle"] as const;

describe("mocked session", () => {
  it("gives the global strategist every region", async () => {
    const regions = await regionsAPI.list();
    const visible = scopeRegions(regions, MOCK_SESSION_USERS.globalStrategist);
    expect(visible).toHaveLength(regions.length);
    expect(visible.length).toBeGreaterThan(1);
  });

  it("gives a scoped role fewer regions than the global strategist", async () => {
    const regions = await regionsAPI.list();
    const global = scopeRegions(regions, MOCK_SESSION_USERS.globalStrategist);
    for (const role of SCOPED_ROLES) {
      const scoped = scopeRegions(regions, MOCK_SESSION_USERS[role]);
      expect(scoped.length).toBeGreaterThan(0);
      expect(scoped.length).toBeLessThan(global.length);
    }
  });

  it("only resolves regions inside the user's scope", async () => {
    const regions = await regionsAPI.list();
    for (const role of SCOPED_ROLES) {
      const user = MOCK_SESSION_USERS[role];
      const scoped = scopeRegions(regions, user);
      expect(scoped.map((region) => region.key)).toEqual(user.regionScope);
    }
  });
});
