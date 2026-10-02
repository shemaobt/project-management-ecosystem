import type { Project } from "../types/project";
import type {
  ProjectBrowseQuery,
  ProjectBrowseResult,
} from "../types/projectBrowse";
import { healthScore } from "../utils/health";
import { getProgress } from "../utils/progress";
import { computeDerived } from "../utils/projectDerived";
import { withheldNotice } from "../utils/region";
import { DEFAULT_SORT } from "../constants/sorting";
import type { SessionPersona } from "../contexts/session";
import {
  filterProjects,
  type FacetCounts,
  type GatedFacet,
} from "../utils/search";
import { loadProjects } from "./projects";
import { applyRecordOverlay } from "./projectRecord";
import { asReadBy, coordinatesAnything, readsHealth } from "./reader";
import { mockPersona } from "./session";

export type { ProjectBrowseQuery, ProjectBrowseResult };

/**
 * The same comparator `components/pages/projetos/sorting.ts` uses, kept as a private
 * copy rather than an import: `fixtures/` is the foundation every screen reads from and
 * must not depend on a page component. Sort now happens server-side, so the shared one
 * still exists only to order the window this test double already computed.
 */
function blanksLast(
  pick: (project: Project) => string,
  compare: (a: string, b: string) => number,
): (a: Project, b: Project) => number {
  return (a, b) => {
    const left = pick(a);
    const right = pick(b);
    if (!left || !right) return left === right ? 0 : left ? -1 : 1;
    return compare(left, right);
  };
}

function comparatorFor(
  key: ProjectBrowseQuery["sort"],
): (a: Project, b: Project) => number {
  switch (key) {
    case "deadline":
      return blanksLast(
        (project) => project.deadline,
        (a, b) => (a < b ? -1 : a > b ? 1 : 0),
      );
    case "name":
      return blanksLast(
        (project) => project.languageName,
        (a, b) => a.localeCompare(b),
      );
    case "team":
      return blanksLast(
        (project) => project.team,
        (a, b) => a.localeCompare(b),
      );
    case "progress":
      return (a, b) => getProgress(b) - getProgress(a);
    case "health":
      return (a, b) => healthScore(b) - healthScore(a);
  }
}

/**
 * The three fields `utils/prayer.ts` gates behind consent — absent from
 * `ShemaProjectCard` on purpose, because a bulk list read is not the coordination
 * surface §6.2 carves the exception for. Cleared on every item here too, not only a
 * sensitive-country one, so this test double answers the same way the real endpoint
 * does for every project rather than only for the ones §6.1 already redacts.
 */
function withoutPrayerFields(project: Project): Project {
  return {
    ...project,
    prayerRequests: "",
    prayerVisibility: undefined,
    prayerRequestsAudio: undefined,
  };
}

/** The gated groups this persona is not told — `_facets_as_read` on the server. */
function hiddenFacets(persona: SessionPersona): GatedFacet[] {
  return readsHealth(persona) ? [] : ["health"];
}

/**
 * What the persona may ask — `_query_as_read`: a filter or an order on a hidden group is
 * ignored, as if the request had not carried it, never refused.
 */
function queryAsRead(
  query: ProjectBrowseQuery,
  hidden: readonly GatedFacet[],
): ProjectBrowseQuery {
  if (hidden.length === 0) return query;
  const filters = { ...query.filters };
  for (const group of hidden) filters[group] = null;
  const sort =
    hidden.includes("health") && query.sort === "health" ? DEFAULT_SORT : query.sort;
  return { ...query, filters, sort };
}

function countsAsRead(
  counts: FacetCounts,
  hidden: readonly GatedFacet[],
): FacetCounts {
  return hidden.length === 0 ? counts : { ...counts, absent: hidden };
}

/**
 * Each card is built for the mock persona the way the server builds it for its reader
 * (OBT-528) — coordination reads the truth of a sensitive place, everybody else the region
 * — **before** the filter, the counts and the sort, because the server's search and facets
 * read the card the reader was given. `derived` is computed first, off the truth, so the
 * region a reduced card names is the true one.
 */
export async function browseProjects(
  asked: ProjectBrowseQuery,
): Promise<ProjectBrowseResult> {
  const persona = mockPersona();
  const hidden = hiddenFacets(persona);
  const query = queryAsRead(asked, hidden);
  // Anything the record double has been told, applied on top: inside one session the
  // list and the record read the same collection, exactly as they do against the API.
  const cards = applyRecordOverlay(loadProjects()).map((project) =>
    withoutPrayerFields(
      asReadBy({ ...project, derived: computeDerived(project) }, persona),
    ),
  );
  const result = filterProjects(cards, query.filters, query.search);
  const sorted = [...result.projects].sort(comparatorFor(query.sort));

  const start = query.offset;
  const stop = query.limit === null ? undefined : start + query.limit;
  const items = sorted.slice(start, stop);

  return {
    items,
    counts: countsAsRead(result.counts, hidden),
    matched: result.projects.length,
    total: result.total,
    locationsWithheld: withheldNotice(items, coordinatesAnything(persona)),
  };
}
