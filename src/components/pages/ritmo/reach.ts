import type { RegionKey } from "../../../types/region";
import type { RhythmScope } from "../../../utils/rhythm";

export type RegionScope = RhythmScope & { key: RegionKey };

/**
 * The rows a reader may act on: the regions their session reaches, and never `global` — the
 * server holds every meeting per region and refuses a log outside the caller's scope (BE-10), so
 * a row it would refuse is not drawn. The server filters the log it answers; this is the other
 * half, the regions the screen derives from the projects, which no server read scoped.
 */
export function withinReach(
  scopes: readonly RhythmScope[],
  canSeeRegion: (key: RegionKey) => boolean,
): RegionScope[] {
  return scopes.filter(
    (scope): scope is RegionScope =>
      scope.key !== "global" && canSeeRegion(scope.key),
  );
}

/**
 * The sentence a meeting card says when it has no row. The server cuts the list to the reader's
 * regions, so an empty list does not say whether the installation has no projects or the reader
 * reaches none of them: a reader scoped to regions (`regionScope`) is told about their regions,
 * and only a reader who reaches everything is told there is no project at all.
 */
export function emptyAgendaKey(
  projectCount: number,
  regionScope: readonly RegionKey[] | null,
  regionsRead: boolean,
): "ritmo_no_projects" | "ritmo_no_projects_reach" | "loading" {
  if (projectCount === 0) {
    return regionScope ? "ritmo_no_projects_reach" : "ritmo_no_projects";
  }
  return regionsRead ? "ritmo_no_projects_reach" : "loading";
}
