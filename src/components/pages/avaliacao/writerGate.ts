import type { SessionRole } from "../../../types/session";
import { canWriteHealth } from "../../../utils/access";

/** Where a reader who does not file a health assessment is sent instead of the questionnaire. */
export const ASSESSMENT_REDIRECT = "/formularios";

/**
 * The address the assessment route answers with for whoever is outside `HEALTH_WRITERS`
 * (OBT-579), or `null` for a writer. A pure function, because the static renderer runs no
 * effects and a `<Navigate>` proves nothing about its destination there.
 */
export function assessmentRedirect(roles: readonly SessionRole[]): string | null {
  return canWriteHealth(roles) ? null : ASSESSMENT_REDIRECT;
}
