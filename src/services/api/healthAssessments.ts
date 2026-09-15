import { CURRENT_QUESTION_SET_VERSION } from "../../constants/health";
import type { AssessmentDraft } from "../../types/assessment";
import type { HealthRating } from "../../types/project";
import { toLocalIsoDate } from "../../utils/format";
import { http } from "./client";
import { toApiFailure } from "./errors";
import { mapRecord, readFieldErrors, type RecordSaveResult } from "./projectRecord";

const SHEMA = "/shema";

/** Shared with the record's own write path — the actor's calendar day, not the server's. */
const LOCAL_DAY_HEADER = "X-Shema-Local-Date";

/** `""` is the transport's word for *not assessed*; BE-07's column word is `null`. */
const ratingOrNull = (value: HealthRating): "boa" | "atencao" | "critica" | null =>
  value === "" ? null : value;

/**
 * The wizard's one wire shape — camelCase, matching `ShemaHealthAssessmentSubmission`'s
 * alias and BE-07 §9.4's rule that the record-side fields (pastoral, prayer) travel
 * alongside the reading rather than through a second `PATCH`.
 *
 * `overallNote` never appears here — BE-07 has no field for a note that cuts across all
 * four dimensions, and `dimensionNotes` is the assessment's one source of note text
 * (FE-37, §5.3): stuffing a fifth paragraph into one dimension's note would misattribute
 * it. `Completion.tsx` says so where the field is typed rather than losing the text in
 * silence.
 */
export function buildSubmission(draft: AssessmentDraft): Record<string, unknown> {
  const raised = draft.prayerRequest.trim();
  const body: Record<string, unknown> = {
    date: draft.date || null,
    assessor: draft.assessor.trim() || null,
    emotional: ratingOrNull(draft.ratings.emotional),
    relational: ratingOrNull(draft.ratings.relational),
    spiritual: ratingOrNull(draft.ratings.spiritual),
    physical: ratingOrNull(draft.ratings.physical),
    dimensionNotes: { ...draft.notes },
    questionSetVersion: CURRENT_QUESTION_SET_VERSION,
    needsPastoralIntervention: draft.pastoral,
    pastoralInterventionName: draft.pastoralWho,
    pastoralInterventionWhen: draft.pastoralWhen,
  };
  if (raised !== "") {
    body.prayerRequests = raised;
    body.prayerVisibility = draft.prayerVisibility;
  }
  return body;
}

/**
 * File one reading and answer the record it landed on — BE-07's own shape (`-> Project`,
 * `ETag` the new version). No `409`: appending is not replacing, so the only refusals
 * this endpoint can hand back are `422` (an empty reading, an unknown question-set
 * version) and a transport failure. `RecordSaveResult`'s `"conflict"` branch is unreached
 * from here and kept only because the type is shared with the record's own write.
 */
export const healthAssessmentsAPI = {
  /**
   * No `actorName` parameter: the real server reads the author off the bearer token and
   * never off the body. The fixture double takes a third argument for the same purpose
   * (INT-04) — a function with fewer declared parameters is assignable wherever the
   * three-argument shape is expected, so `source.ts`'s `pick()` still type-checks.
   */
  async submit(id: string, draft: AssessmentDraft): Promise<RecordSaveResult> {
    try {
      const response = await http.post<unknown>(
        `${SHEMA}/projects/${encodeURIComponent(id)}/health-assessments`,
        buildSubmission(draft),
        {
          headers: { [LOCAL_DAY_HEADER]: toLocalIsoDate() },
          validateStatus: (status) => status < 400 || status === 400 || status === 422,
        },
      );
      if (response.status === 422 || response.status === 400) {
        return { ok: false, reason: "invalid", errors: readFieldErrors(response.data) };
      }
      const etag = (response.headers as Record<string, unknown> | undefined)?.etag;
      return {
        ok: true,
        record: {
          project: mapRecord(response.data as Parameters<typeof mapRecord>[0]),
          version: typeof etag === "string" ? etag : "",
        },
      };
    } catch (thrown) {
      return { ok: false, reason: "failed", failure: toApiFailure(thrown) };
    }
  },
};
