import type { RecordField } from "../types/projectRecord";
import { RECORD_TABS, type RecordTabId } from "./recordTabs";

/**
 * Which tab owns which field — the whole of "each tab saves only its own fields".
 *
 * A save sends the fields the coordinator actually changed, and this table is what
 * attributes each of them to a tab: for the report the footer prints, for locating a
 * server refusal, and for deciding what the record write does not yet carry. The fields
 * a tab merely *displays* are not here; ownership is about who may write.
 *
 * The partition is exhaustive and disjoint over everything a record write can touch —
 * `src/stores/__tests__/recordSave.test.ts` asserts both directions — so a field added
 * to `Project` cannot quietly belong to nobody.
 */
export const TAB_FIELDS: Record<RecordTabId, readonly RecordField[]> = {
  identidade: [
    "languageName",
    "languageCode",
    "bridgeLanguage",
    "vitalityStatus",
    "location",
    "location2",
    "speakerCount",
    "coords",
    "sensitiveCountry",
    "sensitivity",
  ],
  equipe: [
    "team",
    "ywamBase",
    "teamLeader",
    "mentor",
    "translators",
    "technicalReviewers",
    "partnerOrg",
    "teamContact",
    "teamLeaderContact",
    "mentorContact",
    "facilitator",
  ],
  objetivo: [
    "objective",
    "scopeDetails",
    "objectiveNotes",
    "translationType",
    "portion",
    "phases",
    "startDate",
    "deadline",
  ],
  recursos: [
    "financialResources",
    "financialNotes",
    "financialOtherDetails",
    "orgRole",
    "inETEN",
  ],
  progresso: [
    "bookProgress",
    "storyProgress",
    "otherProgress",
    "status",
    "statusComments",
    "statusGoal",
    "totalUnits",
    "totalUnitsType",
    "translatedUnits",
    "communityCheckedUnits",
    "approvedUnits",
    "storiesTranslated",
    "readyVesselsAudioHours",
    "lastUpdated",
  ],
  saude: [
    "healthEmotional",
    "healthRelational",
    "healthSpiritual",
    "healthPhysical",
    "healthAssessmentDate",
    "healthAssessor",
    "healthNotes",
    "healthHistory",
    "prayerRequests",
    "prayerVisibility",
    "prayerRequestsAudio",
    "needsPastoralIntervention",
    "pastoralInterventionName",
    "pastoralInterventionWhen",
  ],
  necessidades: ["needsItems", "needsNotes"],
  midia: ["mediaPhotos", "mediaVideos"],
  notas: ["notes"],
  materiais: ["materials"],
};

/**
 * The record write's own surface — every field `PATCH /shema/projects/{id}` accepts.
 *
 * It is narrower than the ten tabs, and narrower than FE-44 §10's table, which routes
 * the whole record through this one endpoint. BE-06 did not take the health projection
 * (its only writer is the assessment, §5.2 — BE-07) or media and materials, whose bytes
 * have no serving path yet. Those are named in {@link PENDING_WRITE} rather than
 * silently dropped. **INT-05 moved `needsItems` here** once BE-08 landed the batch write
 * — the need items travel with the record's own `PATCH`, per FE-44 §9.5.
 *
 * The body model forbids unknown keys, so sending a field that is not here is a 422 on
 * the whole save — which is why this set is the gate and not a comment.
 */
export const SERVER_WRITABLE: ReadonlySet<RecordField> = new Set<RecordField>([
  "languageName",
  "languageCode",
  "bridgeLanguage",
  "vitalityStatus",
  "location",
  "location2",
  "speakerCount",
  "coords",
  "sensitiveCountry",
  "sensitivity",
  "team",
  "ywamBase",
  "teamLeader",
  "mentor",
  "translators",
  "technicalReviewers",
  "partnerOrg",
  "teamContact",
  "teamLeaderContact",
  "mentorContact",
  "facilitator",
  "objective",
  "scopeDetails",
  "objectiveNotes",
  "translationType",
  "portion",
  "financialResources",
  "financialNotes",
  "financialOtherDetails",
  "orgRole",
  "inETEN",
  "totalUnits",
  "totalUnitsType",
  "translatedUnits",
  "communityCheckedUnits",
  "approvedUnits",
  "bookProgress",
  "storyProgress",
  "otherProgress",
  "phases",
  "startDate",
  "deadline",
  "lastUpdated",
  "status",
  "statusComments",
  "statusGoal",
  "storiesTranslated",
  "readyVesselsAudioHours",
  "prayerRequests",
  "prayerVisibility",
  "prayerRequestsAudio",
  "needsPastoralIntervention",
  "pastoralInterventionName",
  "pastoralInterventionWhen",
  "needsNotes",
  "notes",
  "needsItems",
]);

/**
 * `ywamBase` is accepted and folded onto `team`, so only one of them travels.
 *
 * They are one column: JOCUM is the Portuguese for YWAM, the tab shows one input and
 * writes both (§5.2), and the server refuses a payload carrying two different values
 * rather than picking one. Sending the pair would make that refusal reachable from a
 * screen that cannot produce it, so the pair is collapsed here, at the boundary.
 */
export const FOLDED_INTO_TEAM: RecordField = "ywamBase";

/**
 * Fields a tab still edits and this endpoint does not yet take, with the issue that
 * will take them. The tab says so before anything is typed, and a save keeps them in
 * the draft instead of reporting them as written.
 */
export const PENDING_WRITE: Partial<
  Record<RecordTabId, { fields: readonly RecordField[]; noteKey: string }>
> = {
  saude: {
    fields: [
      "healthEmotional",
      "healthRelational",
      "healthSpiritual",
      "healthPhysical",
      "healthAssessmentDate",
      "healthAssessor",
      "healthNotes",
      "healthHistory",
    ],
    noteKey: "record_pending_health",
  },
  midia: {
    fields: ["mediaPhotos", "mediaVideos"],
    noteKey: "record_pending_media",
  },
  materiais: { fields: ["materials"], noteKey: "record_pending_materials" },
};

const OWNER = new Map<RecordField, RecordTabId>(
  RECORD_TABS.flatMap((tab) =>
    TAB_FIELDS[tab].map((field) => [field, tab] as const),
  ),
);

/** The tab a field belongs to — `null` for one no tab writes (`id`, `derived`, …). */
export function tabOf(field: RecordField): RecordTabId | null {
  return OWNER.get(field) ?? null;
}

/** The fields of `tab` this endpoint accepts, in the tab's own order. */
export function writableFieldsOf(tab: RecordTabId): RecordField[] {
  return TAB_FIELDS[tab].filter(
    (field) => SERVER_WRITABLE.has(field) && field !== FOLDED_INTO_TEAM,
  );
}

/** Every field the record write accepts, across all ten tabs. */
export function allWritableFields(): RecordField[] {
  return RECORD_TABS.flatMap(writableFieldsOf);
}

/** The label a changed field is announced under — the tab's own catalogue, reused. */
export const FIELD_LABEL_KEYS: Partial<Record<RecordField, string>> = {
  languageName: "f_lang_name",
  languageCode: "f_lang_code",
  bridgeLanguage: "f_bridge",
  vitalityStatus: "f_vitality",
  location: "f_location",
  location2: "f_location2",
  speakerCount: "f_speakers",
  coords: "f_coords",
  sensitiveCountry: "f_sensitive",
  sensitivity: "f_sensitive",
  team: "d_facilitators",
  ywamBase: "f_ywam",
  teamLeader: "f_leader",
  mentor: "f_mentor",
  translators: "f_translators",
  technicalReviewers: "f_reviewers",
  partnerOrg: "f_partner",
  teamContact: "f_team_contact",
  teamLeaderContact: "f_leader_contact",
  mentorContact: "f_mentor_contact",
  facilitator: "f_facilitators",
  objective: "sec_objective",
  scopeDetails: "f_scope",
  objectiveNotes: "f_obj",
  translationType: "f_translation_type",
  portion: "d_portion",
  phases: "f_phases",
  startDate: "f_start",
  deadline: "f_deadline",
  financialResources: "f_financial",
  financialNotes: "f_financial",
  financialOtherDetails: "f_financial_other",
  orgRole: "d_type",
  inETEN: "f_in_eten",
  totalUnits: "f_total_planned",
  totalUnitsType: "f_unit_type",
  translatedUnits: "d_p_translated",
  communityCheckedUnits: "d_p_community",
  approvedUnits: "d_p_approved",
  bookProgress: "d_bp_books",
  storyProgress: "d_bp_stories",
  otherProgress: "progress_other_title",
  status: "f_project_status",
  statusComments: "d_notes",
  statusGoal: "d_objective",
  storiesTranslated: "f_stories_translated",
  readyVesselsAudioHours: "f_rv_audio_hours",
  lastUpdated: "d_last_update",
  healthEmotional: "f_emotional",
  healthRelational: "f_relational",
  healthSpiritual: "f_spiritual",
  healthPhysical: "f_physical",
  healthAssessmentDate: "f_assessment_date",
  healthAssessor: "f_assessor",
  healthNotes: "f_health_notes",
  healthHistory: "sec_health",
  prayerRequests: "f_prayer",
  prayerVisibility: "d_prayer",
  prayerRequestsAudio: "oracao_audio",
  needsPastoralIntervention: "f_pastoral",
  pastoralInterventionName: "f_pastoral_who",
  pastoralInterventionWhen: "f_pastoral",
  needsItems: "sec_needs",
  needsNotes: "f_needs_notes",
  mediaPhotos: "f_media_photos_title",
  mediaVideos: "f_media_videos_title",
  notes: "f_notes",
  materials: "sec_materials",
};
