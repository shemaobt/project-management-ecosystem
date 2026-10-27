import type { RegionKey } from "../../../types/region";
import type { SessionRole } from "../../../types/session";
import { canWriteHealth, canWriteHealthIn } from "../../../utils/access";

/** Where a reader who does not file a health assessment is sent instead of the questionnaire. */
export const ASSESSMENT_REDIRECT = "/formularios";

/**
 * The address the assessment route answers with for whoever is outside `HEALTH_WRITERS`
 * (OBT-579), or `null` for a writer. A pure function, because the static renderer runs no
 * effects and a `<Navigate>` proves nothing about its destination there.
 */
export function assessmentRedirect(
  roles: readonly SessionRole[],
  writeRegionScope?: readonly RegionKey[] | null,
  region?: RegionKey,
): string | null {
  // Before the record is read the region is unknown, and only the role decides (OBT-579);
  // once it is, a project outside the write scope sends the reader back too (OBT-593).
  const writes =
    region === undefined
      ? canWriteHealth(roles)
      : canWriteHealthIn(roles, writeRegionScope, region);
  return writes ? null : ASSESSMENT_REDIRECT;
}
