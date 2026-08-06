import { EMPTY_REGION_TEAM, REGIONS } from "../constants/regions";
import type { Region, RegionKey, RegionTeam } from "../types/region";

export const REGION_TEAMS: Record<RegionKey, RegionTeam> = {
  "south-america": { ...EMPTY_REGION_TEAM },
  "north-america": { ...EMPTY_REGION_TEAM },
  africa: { ...EMPTY_REGION_TEAM },
  asia: { ...EMPTY_REGION_TEAM },
  oceania: { ...EMPTY_REGION_TEAM },
  europe: { ...EMPTY_REGION_TEAM },
  other: { ...EMPTY_REGION_TEAM },
};

export function loadRegions(): Region[] {
  return REGIONS.map((region) => ({
    ...region,
    team: { ...REGION_TEAMS[region.key] },
  }));
}
