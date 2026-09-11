import { REGION_CENTROIDS } from "../constants/geo";
import type { Project } from "../types/project";
import type {
  ProjectBrowseQuery,
  ProjectBrowseResult,
} from "../types/projectBrowse";
import { computeDerived } from "../utils/projectDerived";
import { filterProjects } from "../utils/search";
import { loadProjects } from "./projects";

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
      return (a, b) =>
        (b.derived?.progress ?? 0) - (a.derived?.progress ?? 0);
    case "health":
      return (a, b) =>
        (b.derived?.healthScore ?? 0) - (a.derived?.healthScore ?? 0);
  }
}

/**
 * Redacts exactly what `LeavingShape` redacts server-side — coords to the region
 * centroid, location and team to the region key / empty — so a fixture-sourced browse
 * result and an API-sourced one need no special-casing downstream
 * (`components/pages/projetos/derived.ts` trusts both equally).
 */
function withheld(project: Project): Project {
  if (!project.sensitiveCountry) return project;
  const region = project.derived?.region ?? "other";
  return {
    ...project,
    location: region,
    location2: undefined,
    team: "",
    ywamBase: "",
    coords: REGION_CENTROIDS[region],
  };
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

export async function browseProjects(
  query: ProjectBrowseQuery,
): Promise<ProjectBrowseResult> {
  const projects = loadProjects();
  const result = filterProjects(projects, query.filters, query.search);
  const sorted = [...result.projects].sort(comparatorFor(query.sort));

  const start = query.offset;
  const stop = query.limit === null ? undefined : start + query.limit;
  const items = sorted.slice(start, stop).map((project) => {
    const derived = computeDerived(project);
    return withoutPrayerFields(withheld({ ...project, derived }));
  });

  const locationsWithheld = items.filter(
    (project) => project.sensitiveCountry,
  ).length;

  return {
    items,
    counts: result.counts,
    matched: result.projects.length,
    total: result.total,
    locationsWithheld: locationsWithheld > 0 ? locationsWithheld : null,
  };
}
