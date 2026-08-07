import { afterEach, describe, expect, it } from "vitest";
import { useRegionsStore } from "../../stores/regionsStore";
import { buildRegionPanel, holderName } from "../../utils/region";
import { projectsAPI } from "..";
import { REGION_TEAMS } from "../regions";

afterEach(() => {
  REGION_TEAMS.oceania = {
    coordinator: "",
    obtLab: "",
    resourceCircle: "",
  };
  useRegionsStore.setState({ regions: [], hydrated: false });
});

describe("org chart as the single source of names", () => {
  it("surfaces a fixture change on the panel card without touching components", async () => {
    REGION_TEAMS.oceania.coordinator = "Nome Real";
    await useRegionsStore.getState().hydrate();
    const cards = buildRegionPanel(
      await projectsAPI.list(),
      useRegionsStore.getState().regions,
      () => true,
    );
    const oceania = cards.find((card) => card.key === "oceania");
    if (!oceania) throw new Error("oceania missing from the panel");
    expect(holderName(oceania.team, "coordinator")).toBe("Nome Real");
    expect(holderName(oceania.team, "obtLab")).toBeNull();
  });

  it("hydrates once and keeps serving the same org chart", async () => {
    await useRegionsStore.getState().hydrate();
    const first = useRegionsStore.getState().regions;
    await useRegionsStore.getState().hydrate();
    expect(useRegionsStore.getState().regions).toBe(first);
    expect(useRegionsStore.getState().hydrated).toBe(true);
    expect(first.length).toBeGreaterThan(0);
  });

  it("hands out teams a consumer cannot corrupt in the fixture", async () => {
    await useRegionsStore.getState().hydrate();
    const oceania = useRegionsStore
      .getState()
      .regions.find((region) => region.key === "oceania");
    if (!oceania) throw new Error("oceania missing from the org chart");
    oceania.team.coordinator = "Rabisco";
    expect(REGION_TEAMS.oceania.coordinator).toBe("");
  });
});
