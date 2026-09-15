import type { Region, RegionKey } from "../../../../types/region";
import {
  getTeamOf,
  orderRegionsByTotals,
  type RegionPanelCard,
} from "../../../../utils/region";

/**
 * Which region cards to show and in what order — off the *baseline* (unfiltered) counts,
 * never off the live filtered ones: a region stays in the panel even when the active
 * filters currently return none of its projects, the same "zero stays visible" rule
 * `Sidebar/Filters` follows (§5.1). And never off a locally re-derived region-per-project
 * pass — the browse response already redacts a sensitive project's placement, so counting
 * from raw projects here would double as a second, weaker owner of the same number the
 * sidebar and the map already show (§13: one owner per fact). The filter-and-sort itself
 * is `orderRegionsByTotals` — the same one `orderRegionPanel` calls off raw projects —
 * so the two callers cannot disagree about which regions show or in what order.
 */
export function orderByCounts(
  baseline: Partial<Record<RegionKey, number>>,
  regions: readonly Region[],
): RegionPanelCard[] {
  return orderRegionsByTotals(baseline).map(({ key, labelKey }) => ({
    key,
    labelKey,
    team: getTeamOf(key, regions),
  }));
}
