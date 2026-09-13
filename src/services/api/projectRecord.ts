import {
  allWritableFields,
  FOLDED_INTO_TEAM,
  SERVER_WRITABLE,
} from "../../constants/recordFields";
import { createEmptyProject } from "../../fixtures";
import type {
  FinancialResource,
  HealthAssessment,
  HealthRating,
  MediaAuthorization,
  MediaPhoto,
  NeedItem,
  Objective,
  ProgressHistoryEntry,
  Project,
  ProjectDerived,
  ProjectMaterial,
  ProjectPhase,
  ProjectVideo,
  TranslationType,
} from "../../types/project";
import type {
  LoadedRecord,
  RecordConflict,
  RecordField,
  RecordFieldError,
} from "../../types/projectRecord";
import type { ApiFailure } from "../../types/session";
import { toLocalIsoDate } from "../../utils/format";
import { http } from "./client";
import { toApiFailure } from "./errors";

const SHEMA = "/shema";

/**
 * The day a progress entry is stamped with is **the coordinator's**, not the server's.
 *
 * FE-44 §7.2's year-end boundary: in UTC-3 a save after 21:00 lands on tomorrow's UTC
 * date, and on 31 December in the next *year*, which is the year an ETEN credit is
 * reconstructed from. The platform stores no timezone for an account, so the day is the
 * client's to state and `toLocalIsoDate` is what states it — the same function FE-24
 * used to stamp a wave-1 save.
 */
const LOCAL_DAY_HEADER = "X-Shema-Local-Date";

/** Dates the record keeps as `""` and the wire keeps as `null`. */
const DATE_FIELDS: ReadonlySet<RecordField> = new Set<RecordField>([
  "startDate",
  "deadline",
  "lastUpdated",
]);

/**
 * A conflict and a refusal are **answers to a save**, not transport failures, so they
 * are read off the response rather than caught out of the interceptor — which is also
 * the only way to reach the 409's `ETag` and the 422's located list, both of which
 * `toApiFailure` reduces to a kind and a sentence. Everything else keeps the shared
 * client's behaviour, including the 401 refresh-and-retry.
 */
const SAVE_ANSWERS = (status: number): boolean =>
  status < 400 || status === 400 || status === 409 || status === 422;

export type RecordSaveResult =
  | { ok: true; record: LoadedRecord }
  | { ok: false; reason: "conflict"; conflict: RecordConflict }
  | { ok: false; reason: "invalid"; errors: RecordFieldError[] }
  | { ok: false; reason: "failed"; failure: ApiFailure };

interface WireAuthorization {
  granted: boolean;
  by: string;
  at: string | null;
}

interface WirePhoto {
  image: null;
  caption: string;
  authorization: WireAuthorization | null;
}

interface WireVideo {
  url: string;
  caption: string | null;
  authorization: WireAuthorization | null;
}

interface WireMaterial {
  id: string;
  kind: ProjectMaterial["kind"];
  scope: string;
  fileName: string | null;
  fileSize: number | null;
  link: string | null;
  format: string | null;
  durationSeconds: number | null;
  authorization: WireAuthorization | null;
}

interface WireNeed {
  id: string;
  category: string;
  urgency: NeedItem["urgency"];
  status: NeedItem["status"];
  description: string;
  estimatedValue: string | null;
  /** `Numeric(14, 2)` over the wire — a decimal string, e.g. `"1234.50"`, never a float. */
  estimatedAmount: string | null;
  estimatedCurrency: string | null;
  deadline: string | null;
  prayerShared: boolean;
  prayerAnswered: boolean;
  fulfilledBy: string | null;
  fulfilledDate: string | null;
  droppedDate: string | null;
  submittedBy: string | null;
  submittedAt: string | null;
  acknowledgedAt: string | null;
  acknowledgedBy: string | null;
}

interface WireAssessment {
  date: string;
  assessor: string;
  emotional: HealthRating | null;
  relational: HealthRating | null;
  spiritual: HealthRating | null;
  physical: HealthRating | null;
  notes: string;
  dimensionNotes: HealthAssessment["dimensionNotes"] | null;
}

interface WireRecord {
  id: string;
  languageName: string;
  languageCode: string;
  bridgeLanguage: string;
  vitalityStatus: string;
  location: string;
  location2: string | null;
  speakerCount: string;
  coords: [number, number];
  translationType: string[];
  financialResources: string[];
  team: string;
  ywamBase: string;
  teamLeader: string;
  teamLeaderContact: string | null;
  mentor: string;
  mentorContact: string | null;
  translators: string;
  technicalReviewers: string;
  partnerOrg: string;
  teamContact: string;
  facilitator: string | null;
  objective: string[];
  scopeDetails: string;
  objectiveNotes: string | null;
  portion: string | null;
  totalUnits: number;
  totalUnitsType: string;
  translatedUnits: number;
  communityCheckedUnits: number;
  approvedUnits: number;
  startDate: string | null;
  deadline: string | null;
  lastUpdated: string | null;
  status: Project["status"] | null;
  sensitivity: string;
  sensitiveCountry: boolean;
  statusComments: string;
  statusGoal: string;
  orgRole: string;
  financialNotes: string | null;
  financialOtherDetails: string | null;
  storiesTranslated: string | null;
  readyVesselsAudioHours: string | null;
  phases: ProjectPhase[];
  bookProgress: Project["bookProgress"];
  storyProgress: Project["storyProgress"];
  otherProgress: Project["otherProgress"] | null;
  progressHistory: ProgressHistoryEntry[];
  healthEmotional: HealthRating | null;
  healthRelational: HealthRating | null;
  healthSpiritual: HealthRating | null;
  healthPhysical: HealthRating | null;
  healthAssessmentDate: string | null;
  healthAssessor: string;
  healthNotes: string;
  healthHistory: WireAssessment[] | null;
  prayerRequests: string;
  prayerVisibility: Project["prayerVisibility"] | null;
  prayerRequestsAudio: string | null;
  needsPastoralIntervention: Project["needsPastoralIntervention"];
  pastoralInterventionName: string;
  pastoralInterventionWhen: string | null;
  needsItems: WireNeed[];
  needsNotes: string;
  notes: string;
  inETEN: boolean;
  materials: WireMaterial[];
  mediaPhotos: WirePhoto[] | null;
  mediaVideos: WireVideo[] | null;
  derived: ProjectDerived | null;
}

const text = (value: string | null | undefined): string => value ?? "";

function authorization(
  wire: WireAuthorization | null,
): MediaAuthorization | null {
  // The decision's day, never a moment — FE-44 §9.0. A record with no `at` is one the
  // server could not date, and `isMediaAuthorized` reads `granted` alone, so an empty
  // string is the honest projection rather than a fabricated day.
  return wire ? { granted: wire.granted, by: wire.by, at: text(wire.at) } : null;
}

function photo(wire: WirePhoto): MediaPhoto {
  return {
    image: wire.image,
    caption: wire.caption,
    authorization: authorization(wire.authorization),
  };
}

function video(wire: WireVideo): ProjectVideo {
  return {
    url: wire.url,
    caption: text(wire.caption),
    authorization: authorization(wire.authorization),
  };
}

function material(wire: WireMaterial): ProjectMaterial {
  return {
    id: wire.id,
    kind: wire.kind,
    scope: wire.scope,
    fileName: text(wire.fileName),
    fileSize: wire.fileSize ?? undefined,
    link: text(wire.link),
    format: text(wire.format),
    durationSeconds: wire.durationSeconds ?? undefined,
    authorization: authorization(wire.authorization),
  };
}

/**
 * The read direction: a wire need, as the record hands it out.
 *
 * `id` now travels — it is the row's address, and a save quotes it back so the server
 * can tell *this one moved* from *this is a new need* (BE-08). `acknowledgedAt` and
 * `acknowledgedBy` are stamped by the server and never sent back; the client's only
 * lever is the gesture, `NeedItem.acknowledged`, which {@link needWire} turns into the
 * stamp. `estimatedAmount` stays a string end to end — `Numeric(14, 2)` on the wire —
 * so a client never rounds a value it did not choose the precision of.
 */
function need(wire: WireNeed): NeedItem {
  return {
    id: wire.id,
    category: wire.category as NeedItem["category"],
    urgency: wire.urgency,
    status: wire.status,
    description: wire.description,
    estimatedValue: text(wire.estimatedValue),
    estimatedAmount: text(wire.estimatedAmount),
    estimatedCurrency: text(wire.estimatedCurrency),
    deadline: text(wire.deadline),
    prayerShared: wire.prayerShared,
    prayerAnswered: wire.prayerAnswered,
    fulfilledBy: text(wire.fulfilledBy),
    fulfilledDate: text(wire.fulfilledDate),
    droppedDate: text(wire.droppedDate),
    submittedBy: text(wire.submittedBy),
    submittedAt: text(wire.submittedAt),
    acknowledgedAt: text(wire.acknowledgedAt),
    acknowledgedBy: text(wire.acknowledgedBy),
  };
}

const maybe = <T,>(value: T | null): T | undefined => value ?? undefined;

/**
 * A story row's four optionals are nullable on the wire and optional on the record.
 *
 * The table reads them through `?? ""` either way, so nothing renders wrong today —
 * but `null` is not the absence `StoryProgressItem` declares, and a row that round-trips
 * through the draft would carry it back out.
 */
function storyRow(wire: Project["storyProgress"][number]): Project["storyProgress"][number] {
  return {
    name: wire.name,
    audioHours: maybe(wire.audioHours ?? null),
    recordLocation: maybe(wire.recordLocation ?? null),
    recordStatus: maybe(wire.recordStatus ?? null),
    aiAssisted: maybe(wire.aiAssisted ?? null),
  };
}

/**
 * The trail, with the server's nulls read as the absence the record means.
 *
 * `historyDeltas` asks `previousTranslated !== undefined`, and `null` passes that test:
 * an entry with no previous side would render its whole count as the advance. The
 * arithmetic is the reason this mapper exists rather than a pass-through.
 */
function historyEntry(wire: ProgressHistoryEntry): ProgressHistoryEntry {
  return {
    ...wire,
    totalUnits: maybe(wire.totalUnits ?? null),
    bookProgress: maybe(wire.bookProgress ?? null),
    storyProgress: wire.storyProgress?.map(storyRow),
    otherProgress: maybe(wire.otherProgress ?? null),
    previousTranslated: maybe(wire.previousTranslated ?? null),
    previousCommunity: maybe(wire.previousCommunity ?? null),
    previousApproved: maybe(wire.previousApproved ?? null),
    fromField: maybe(wire.fromField ?? null),
    formType: maybe(wire.formType ?? null),
  };
}

/** An empty string is this record's "no day"; the wire's is `null` — §9.0's date rule,
 * applied inside a need the same way {@link toWire} applies it at the top level. */
function needDate(value: string | undefined): string | null {
  return value ? value : null;
}

/**
 * The write direction: one `needsItems` row, in the shape `ShemaNeedWrite` accepts.
 *
 * **Not a pass-through.** `acknowledgedAt` / `acknowledgedBy` are read-only on the wire
 * — the write model does not declare them and refuses unknown keys — so they are never
 * sent; what travels instead is `acknowledged`, the gesture BE-08's server turns into
 * the stamp. `id` is omitted for a need this console has not saved yet, which is what
 * tells the server *this is a new need* rather than *this is need id `undefined`*.
 */
function needWire(need: NeedItem): Record<string, unknown> {
  const body: Record<string, unknown> = {
    category: need.category,
    urgency: need.urgency,
    status: need.status,
    description: need.description,
    estimatedValue: need.estimatedValue || null,
    estimatedAmount: need.estimatedAmount || null,
    estimatedCurrency: need.estimatedCurrency || null,
    deadline: needDate(need.deadline),
    prayerShared: Boolean(need.prayerShared),
    prayerAnswered: Boolean(need.prayerAnswered),
    fulfilledBy: need.fulfilledBy || null,
    fulfilledDate: needDate(need.fulfilledDate),
    droppedDate: needDate(need.droppedDate),
    submittedBy: need.submittedBy || null,
    submittedAt: needDate(need.submittedAt),
    acknowledged: Boolean(need.acknowledged),
  };
  if (need.id) body.id = need.id;
  return body;
}

/** An unassessed dimension is `""` and `""` is not `boa` (§5.2) — `null` reads as `""`. */
const rating = (value: HealthRating | null): HealthRating => value ?? "";

function assessment(wire: WireAssessment): HealthAssessment {
  return {
    date: wire.date,
    assessor: wire.assessor,
    emotional: rating(wire.emotional),
    relational: rating(wire.relational),
    spiritual: rating(wire.spiritual),
    physical: rating(wire.physical),
    notes: wire.notes,
    dimensionNotes: wire.dimensionNotes ?? undefined,
  };
}

/**
 * Wire record -> the `Project` the ten tabs already read, built on `createEmptyProject`
 * so that a key the server adds later lands at one documented default rather than
 * `undefined`.
 *
 * `status` is the **stored** one and may be absent; `derived.status` is what the screen
 * shows. `desconhecido` is the record's own word for *nothing was stored*, and it is
 * what `statusOptionsFor` offers as the fourth card so the way back never vanishes.
 */
export function mapRecord(wire: WireRecord): Project {
  return {
    ...createEmptyProject(wire.id),
    languageName: wire.languageName,
    languageCode: wire.languageCode,
    bridgeLanguage: wire.bridgeLanguage,
    vitalityStatus: wire.vitalityStatus,
    location: wire.location,
    location2: text(wire.location2),
    speakerCount: wire.speakerCount,
    coords: wire.coords,
    translationType: wire.translationType as TranslationType[],
    financialResources: wire.financialResources as FinancialResource[],
    team: wire.team,
    ywamBase: wire.ywamBase,
    teamLeader: wire.teamLeader,
    teamLeaderContact: text(wire.teamLeaderContact),
    mentor: wire.mentor,
    mentorContact: text(wire.mentorContact),
    translators: wire.translators,
    technicalReviewers: wire.technicalReviewers,
    partnerOrg: wire.partnerOrg,
    teamContact: wire.teamContact,
    facilitator: text(wire.facilitator),
    objective: wire.objective as Objective[],
    scopeDetails: wire.scopeDetails,
    objectiveNotes: text(wire.objectiveNotes),
    portion: text(wire.portion),
    totalUnits: wire.totalUnits,
    totalUnitsType: wire.totalUnitsType,
    translatedUnits: wire.translatedUnits,
    communityCheckedUnits: wire.communityCheckedUnits,
    approvedUnits: wire.approvedUnits,
    startDate: text(wire.startDate),
    deadline: text(wire.deadline),
    lastUpdated: text(wire.lastUpdated),
    status: wire.status ?? "desconhecido",
    sensitivity: wire.sensitivity,
    sensitiveCountry: wire.sensitiveCountry,
    statusComments: wire.statusComments,
    statusGoal: wire.statusGoal,
    orgRole: wire.orgRole,
    financialNotes: text(wire.financialNotes),
    financialOtherDetails: text(wire.financialOtherDetails),
    storiesTranslated: text(wire.storiesTranslated),
    readyVesselsAudioHours: text(wire.readyVesselsAudioHours),
    phases: wire.phases,
    bookProgress: wire.bookProgress,
    storyProgress: wire.storyProgress.map(storyRow),
    otherProgress: wire.otherProgress ?? [],
    progressHistory: wire.progressHistory.map(historyEntry),
    healthEmotional: rating(wire.healthEmotional),
    healthRelational: rating(wire.healthRelational),
    healthSpiritual: rating(wire.healthSpiritual),
    healthPhysical: rating(wire.healthPhysical),
    healthAssessmentDate: text(wire.healthAssessmentDate),
    healthAssessor: wire.healthAssessor,
    healthNotes: wire.healthNotes,
    healthHistory: (wire.healthHistory ?? []).map(assessment),
    prayerRequests: wire.prayerRequests,
    prayerVisibility: wire.prayerVisibility ?? undefined,
    prayerRequestsAudio: text(wire.prayerRequestsAudio),
    needsPastoralIntervention: wire.needsPastoralIntervention,
    pastoralInterventionName: wire.pastoralInterventionName,
    pastoralInterventionWhen: text(wire.pastoralInterventionWhen),
    needsItems: wire.needsItems.map(need),
    needsNotes: wire.needsNotes,
    notes: wire.notes,
    inETEN: wire.inETEN,
    materials: wire.materials.map(material),
    mediaPhotos: (wire.mediaPhotos ?? []).map(photo),
    mediaVideos: (wire.mediaVideos ?? []).map(video),
    derived: wire.derived ?? undefined,
  };
}

/**
 * The fields named, as the wire wants them — the *only* place a value leaves this app
 * towards the record write.
 *
 * Two conversions and no third: an empty date is `null`, because the record's word for
 * *no day* is `""` and the column's is NULL; and `ywamBase` never travels, because the
 * server serves it from `team` and refuses the pair when the two disagree. Everything
 * else goes as it is — the wire spelling **is** the record's own, which is BE-06's
 * decision and what saves this file a translation table for seventy-three fields.
 */
export function toWire(
  values: Partial<Project>,
  fields: readonly RecordField[],
): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  for (const field of fields) {
    if (field === FOLDED_INTO_TEAM || !SERVER_WRITABLE.has(field)) continue;
    const value = values[field];
    if (value === undefined) continue;
    if (field === "needsItems") {
      body[field] = (value as NeedItem[]).map(needWire);
      continue;
    }
    body[field] = DATE_FIELDS.has(field) && value === "" ? null : value;
  }
  return body;
}

/** `latitude` and `longitude` are two columns and one record field. */
const FIELD_OF_WIRE_KEY = new Map<string, RecordField>([
  ...allWritableFields().map((field) => [field as string, field] as const),
  ["latitude", "coords"],
  ["longitude", "coords"],
  ["ywamBase", "team"],
]);

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : null;
}

function versionOf(value: unknown): number | null {
  return typeof value === "number" ? value : null;
}

/**
 * When the other person saved, read as **the reader's** day.
 *
 * The server stamps an instant in UTC, and slicing it keeps the UTC day: a save at
 * 22:00 on the 11th in São Paulo travels as `...T01:00+00:00` and the banner would say
 * Maria saved it on the 12th. That is the same off-by-a-day `LOCAL_DAY_HEADER` exists
 * to avoid on the way out, and `formatDate` renders whatever comes out of here as if it
 * were already local. A body that carries a bare day has no instant to convert and is
 * kept as it is — reading it as midnight UTC would walk it a day backwards — and
 * anything that is not a day is no day at all rather than a truncated fragment.
 */
function localDay(value: unknown): string | null {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}/.test(value)) return null;
  if (value.length === 10) return value;
  const at = new Date(value);
  return Number.isNaN(at.getTime()) ? null : toLocalIsoDate(at);
}

/**
 * The 409's body, read into something a screen can put in a sentence.
 *
 * A key this client does not know lands in `unknownFields` rather than being dropped:
 * the server's trail is keyed by the write model's own fields, and a conflict that
 * hides half of what moved is worse than one that names a key nobody labelled yet.
 */
export function readConflict(body: unknown): RecordConflict {
  const data = asRecord(body) ?? {};
  const raw = Array.isArray(data.changedFields) ? data.changedFields : [];
  const changed: RecordField[] = [];
  const unknown: string[] = [];
  for (const key of raw) {
    if (typeof key !== "string") continue;
    const field = FIELD_OF_WIRE_KEY.get(key);
    if (!field) unknown.push(key);
    else if (!changed.includes(field)) changed.push(field);
  }
  return {
    expectedVersion: versionOf(data.expectedVersion),
    currentVersion: versionOf(data.currentVersion),
    changedFields: changed,
    unknownFields: unknown,
    changedBy: typeof data.changedBy === "string" ? data.changedBy : "",
    changedAt: localDay(data.changedAt),
    detail: typeof data.detail === "string" ? data.detail : null,
  };
}

/**
 * A refusal, located — FastAPI's `loc` walked down to the field and, for a progress
 * table, the row.
 *
 * The batch is what makes the row matter: the body model validates every row before
 * anything is applied, so a rejected batch comes back naming *each* bad row at once and
 * none of them was written. A `loc` this client cannot place keeps its message and
 * loses only its position.
 */
export function readFieldErrors(body: unknown): RecordFieldError[] {
  const data = asRecord(body);
  const detail = data?.detail;

  if (typeof detail === "string") {
    return [{ field: null, index: null, message: detail }];
  }
  if (!Array.isArray(detail)) return [];

  return detail.flatMap((entry): RecordFieldError[] => {
    const item = asRecord(entry);
    const loc = Array.isArray(item?.loc) ? item.loc : [];
    const path = loc.filter((part) => part !== "body");
    const head = path.find((part) => typeof part === "string");
    const index = path.find((part) => typeof part === "number");
    const message = typeof item?.msg === "string" ? item.msg : "";
    if (!message) return [];
    return [
      {
        field: (typeof head === "string" && FIELD_OF_WIRE_KEY.get(head)) || null,
        index: typeof index === "number" ? index : null,
        message: message.replace(/^Value error, /, ""),
      },
    ];
  });
}

function etagOf(headers: unknown): string {
  const value = asRecord(headers)?.etag;
  return typeof value === "string" ? value : "";
}

function answer(
  status: number,
  data: unknown,
  headers: unknown,
): RecordSaveResult {
  if (status === 409) {
    return { ok: false, reason: "conflict", conflict: readConflict(data) };
  }
  // An empty list is a refusal this client could not place — the screen says the save
  // was refused without inventing a field for it, rather than printing an empty bullet.
  if (status === 422 || status === 400) {
    return { ok: false, reason: "invalid", errors: readFieldErrors(data) };
  }
  return {
    ok: true,
    record: { project: mapRecord(data as WireRecord), version: etagOf(headers) },
  };
}

function transportFailure(thrown: unknown): RecordSaveResult {
  return { ok: false, reason: "failed", failure: toApiFailure(thrown) };
}

export const projectRecordAPI = {
  /** One record, whole — the ten tabs' read, and the version their saves quote. */
  async read(id: string): Promise<LoadedRecord> {
    const response = await http.get<WireRecord>(
      `${SHEMA}/projects/${encodeURIComponent(id)}`,
    );
    return {
      project: mapRecord(response.data),
      version: etagOf(response.headers),
    };
  },

  /** A new record at the slug the client minted. No `If-Match`: there is no version yet. */
  async create(project: Project): Promise<RecordSaveResult> {
    try {
      const response = await http.post<unknown>(
        `${SHEMA}/projects`,
        { id: project.id, ...toWire(project, allWritableFields()) },
        {
          headers: { [LOCAL_DAY_HEADER]: toLocalIsoDate() },
          validateStatus: SAVE_ANSWERS,
        },
      );
      return answer(response.status, response.data, response.headers);
    } catch (thrown) {
      return transportFailure(thrown);
    }
  },

  /**
   * Save what changed and nothing else, against the version the record was read at.
   *
   * One request for the whole diff, however many tabs it came from: absent means
   * unchanged all the way down, so a field a tab did not touch never travels and cannot
   * overwrite what somebody else put there — and one request is what makes a twenty-row
   * progress table one result instead of twenty.
   */
  async patch(
    id: string,
    patch: Record<string, unknown>,
    version: string,
  ): Promise<RecordSaveResult> {
    try {
      const response = await http.patch<unknown>(
        `${SHEMA}/projects/${encodeURIComponent(id)}`,
        patch,
        {
          headers: {
            "If-Match": version,
            [LOCAL_DAY_HEADER]: toLocalIsoDate(),
          },
          validateStatus: SAVE_ANSWERS,
        },
      );
      return answer(response.status, response.data, response.headers);
    } catch (thrown) {
      return transportFailure(thrown);
    }
  },
};
