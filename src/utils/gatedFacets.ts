import { EMPTY_FILTERS, type ProjectFilters } from "../stores/filtersStore";
import type { FacetCounts, FacetGroup } from "./search";

/**
 * The facet groups the server may leave out of `counts.groups` and `counts.groupAll` for a
 * reader who does not read what they count — `health` outside the health audience
 * (OBT-553), `sensitive` for whoever coordinates no region (OBT-556). A group left out is
 * not a group of zeros: it says nothing, the server ignores its filter, and the sidebar
 * does not draw it.
 *
 * `sensitive` is read off the group alone, never off `locationsWithheld`: that one is
 * `null` for coordination too when the window holds no withheld project.
 */
export const GATED_FACETS = [
  "health",
  "sensitive",
] as const satisfies readonly FacetGroup[];

export type GatedFacet = (typeof GATED_FACETS)[number];

/**
 * The groups this reader is not shown: the ones the server left out, and `health` when the
 * session already says the reader is outside the health audience. Whoever draws a group or
 * keeps a filter off a facet asks this and nothing else.
 */
export function absentGroups(
  counts: Pick<FacetCounts, "absent"> | null,
  readsHealth: boolean,
): readonly GatedFacet[] {
  return GATED_FACETS.filter(
    (group) =>
      (counts?.absent.includes(group) ?? false) ||
      (group === "health" && !readsHealth),
  );
}

/**
 * The filters with the ones that name an absent group taken off. The server ignores such a
 * filter, so keeping it would leave a chip, a *clear all* and an address promising a
 * narrowing the list does not show — a saved link with `?health=critica` is how it gets
 * there. The same object when nothing changes, so a caller can tell.
 */
export function withoutAbsentFilters(
  filters: ProjectFilters,
  absent: readonly GatedFacet[],
): ProjectFilters {
  const stale = absent.filter((group) => filters[group] !== EMPTY_FILTERS[group]);
  if (stale.length === 0) return filters;
  const kept = { ...filters };
  for (const group of stale) reset(kept, group);
  return kept;
}

function reset<K extends keyof ProjectFilters>(filters: ProjectFilters, key: K): void {
  filters[key] = EMPTY_FILTERS[key];
}
