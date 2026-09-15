import { EMPTY_REGION_TEAM, REGIONS } from "../constants/regions";
import type { Region, RegionKey, RegionTeam, RoleChange } from "../types/region";
import type { SaveOutcome } from "../types/team";
import { diffTeams, summarize } from "../utils/team";

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

/**
 * Stands in for `save_region_team.py`: the real endpoint reads the stored
 * seat and stamps the actor and its own clock, so this is the one place the
 * fixture layer needs `from`/`changedBy`/`now` at all — nothing is persisted
 * here, exactly as `regionsAPI.list()` keeps serving the pristine seed
 * (§4.1's "the fixture module never mutates"); the store applies the
 * returned changes to its own copy.
 */
export async function saveTeam(
  regionKey: RegionKey,
  from: RegionTeam,
  to: RegionTeam,
  changedBy: string,
  now: Date,
): Promise<{ outcome: SaveOutcome; changes: RoleChange[] }> {
  const region = REGIONS.find((entry) => entry.key === regionKey);
  const changes = region
    ? diffTeams([{ ...region, team: from }], { [regionKey]: to }, changedBy, now)
    : [];
  return { outcome: summarize(changes), changes };
}

export async function loadRoleChanges(): Promise<RoleChange[]> {
  return [];
}
