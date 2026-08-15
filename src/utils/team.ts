import { EMPTY_REGION_TEAM } from "../constants/regions";
import { ROLES } from "../constants/roles";
import type { Region, RegionKey, RoleChange } from "../types/region";
import type { RoleKey } from "../types/role";
import type { SaveOutcome, TeamDraft } from "../types/team";
import { toLocalIsoDate } from "./format";

export type TeamDrafts = Record<RegionKey, TeamDraft>;

export function draftsFor(regions: readonly Region[]): TeamDrafts {
  const drafts = {} as TeamDrafts;
  for (const region of regions) {
    drafts[region.key] = { ...EMPTY_REGION_TEAM, ...region.team };
  }
  return drafts;
}

export function diffTeams(
  regions: readonly Region[],
  drafts: TeamDrafts,
  changedBy: string,
  now: Date = new Date(),
): RoleChange[] {
  const changedAt = toLocalIsoDate(now);
  const changes: RoleChange[] = [];

  for (const region of regions) {
    const draft = drafts[region.key];
    if (!draft) continue;
    for (const role of ROLES) {
      const from = region.team[role.key].trim();
      const to = draft[role.key].trim();
      if (from === to) continue;
      changes.push({
        regionKey: region.key,
        role: role.key,
        from,
        to,
        changedBy,
        changedAt,
      });
    }
  }

  return changes;
}

export function applyChanges(
  regions: readonly Region[],
  changes: readonly RoleChange[],
): Region[] {
  if (changes.length === 0) return regions.map((region) => ({ ...region }));

  return regions.map((region) => {
    const mine = changes.filter((change) => change.regionKey === region.key);
    if (mine.length === 0) return { ...region };
    const team = { ...region.team };
    for (const change of mine) team[change.role] = change.to;
    return { ...region, team };
  });
}

export function summarize(changes: readonly RoleChange[]): SaveOutcome {
  return {
    changed: changes.length,
    filled: changes.filter((change) => change.from === "" && change.to !== "")
      .length,
    cleared: changes.filter((change) => change.to === "").length,
  };
}

export function unassignedCount(regions: readonly Region[]): number {
  return regions.reduce(
    (total, region) =>
      total + ROLES.filter((role) => !region.team[role.key].trim()).length,
    0,
  );
}

export function lastChangeFor(
  changes: readonly RoleChange[],
  regionKey: RegionKey,
  role: RoleKey,
): RoleChange | null {
  for (let index = changes.length - 1; index >= 0; index -= 1) {
    const change = changes[index];
    if (change.regionKey === regionKey && change.role === role) return change;
  }
  return null;
}
