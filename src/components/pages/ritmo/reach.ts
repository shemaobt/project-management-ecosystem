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
