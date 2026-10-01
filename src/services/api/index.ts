import * as fixture from "../../fixtures";
import * as api from "./endpoints";
import { healthAssessmentsAPI as apiHealthAssessmentsAPI } from "./healthAssessments";
import { projectBrowseAPI as apiProjectBrowseAPI } from "./projectBrowse";
import { projectRecordAPI as apiProjectRecordAPI } from "./projectRecord";
import {
  resourceRequestsAPI as apiResourceRequestsAPI,
  type ResourceRequestsAPI,
} from "./resourceRequests";
import { resolveSource, type DataNamespace } from "./source";

function pick<T>(namespace: DataNamespace, real: T, double: T): T {
  return resolveSource(namespace) === "api" ? real : double;
}

export const projectsAPI = pick<typeof fixture.projectsAPI>(
  "projects",
  api.projectsAPI,
  fixture.projectsAPI,
);

export const projectBrowseAPI = pick<typeof fixture.projectBrowseAPI>(
  "projectsBrowse",
  apiProjectBrowseAPI,
  fixture.projectBrowseAPI,
);

export const projectRecordAPI = pick<typeof fixture.projectRecordAPI>(
  "projectRecord",
  apiProjectRecordAPI,
  fixture.projectRecordAPI,
);

export const healthAssessmentsAPI = pick<typeof fixture.healthAssessmentsAPI>(
  "healthAssessments",
  apiHealthAssessmentsAPI,
  fixture.healthAssessmentsAPI,
);

export const regionsAPI = pick<typeof fixture.regionsAPI>(
  "regions",
  api.regionsAPI,
  fixture.regionsAPI,
);

export const meetingsAPI = pick<typeof fixture.meetingsAPI>(
  "meetings",
  api.meetingsAPI,
  fixture.meetingsAPI,
);

export const prayerAPI = pick<typeof fixture.prayerAPI>(
  "prayer",
  api.prayerAPI,
  fixture.prayerAPI,
);

export const intercessorsAPI = pick<typeof fixture.intercessorsAPI>(
  "intercessors",
  api.intercessorsAPI,
  fixture.intercessorsAPI,
);

export const etenAPI = pick<typeof fixture.etenAPI>(
  "eten",
  api.etenAPI,
  fixture.etenAPI,
);

export const formsAPI = pick<typeof fixture.formsAPI>(
  "forms",
  api.formsAPI,
  fixture.formsAPI,
);

export const membersAPI = pick<typeof fixture.membersAPI>(
  "members",
  api.membersAPI,
  fixture.membersAPI,
);

export const accessAPI: api.AccessAPI | null =
  resolveSource("access") === "api" ? api.accessAPI : null;

/**
 * The Prayer Pulse has no fixture (INT-06 · OBT-411): with no server there is nothing to render
 * the file from, and a sample that looked like a real Pulse is exactly what must never be
 * mistaken for one. `null` keeps the button off the wall in fixture mode — absent, not disabled.
 */
export const prayerPulseAPI: api.PrayerPulseAPI | null =
  resolveSource("prayer") === "api" ? api.prayerPulseAPI : null;

/**
 * The bell's panel and the projects export and import have no fixture double (INT-11 ·
 * OBT-416). With no server the bell derives its notices from the fixture projects, as it
 * always did, and the import applies to the fixture store; the export has **no** client side at
 * all — a second implementation of it would be a second place for the privacy filters to be
 * wrong — so `null` is what the export dialog reads to say the export needs the server.
 */
export const notificationsAPI: api.NotificationsAPI | null =
  resolveSource("notifications") === "api" ? api.notificationsAPI : null;

export const transferAPI: api.TransferAPI | null =
  resolveSource("transfer") === "api" ? api.transferAPI : null;

export const resourceRequestsAPI: ResourceRequestsAPI | null =
  resolveSource("resourceRequests") === "api" ? apiResourceRequestsAPI : null;

export const geoAPI = fixture.geoAPI;

export {
  MOCK_SESSION_KEY,
  MOCK_SESSION_PERSONAS,
  readMockRole,
  type MockPersona,
} from "../../fixtures";

export { announceFailure, failureSentence } from "./announce";
export { authAPI, pulseLanguage, readSession, sessionAPI } from "./endpoints";
export { API_BASE_URL, REQUEST_TIMEOUT_MS, http } from "./client";
export {
  FAILURE_MESSAGE_KEYS,
  UNKNOWN_VOCABULARY,
  failure,
  failureMessage,
  failureMessageKey,
  isAnnounceable,
  isApiFailure,
  isRetryable,
  serverSentence,
  toApiFailure,
} from "./errors";
export { hasSession, onSessionEvent } from "./tokens";
export { resolveSource } from "./source";
export type { DataNamespace, DataSource } from "./source";
export type {
  AccessAPI,
  ExportedFile,
  ImportAnswer,
  NotificationsAPI,
  PrayerPulseAPI,
  PrayerPulseFile,
  PulseLanguage,
  ServedPanel,
  TransferAPI,
  TransferFormat,
  TransferProgress,
} from "./endpoints";
export type { ResourceRequestsAPI } from "./resourceRequests";
export type { Translate } from "./errors";
export type { ProjectBrowseQuery, ProjectBrowseResult } from "../../types/projectBrowse";
export { mapRecord, readConflict, readFieldErrors, toWire } from "./projectRecord";
export type { RecordSaveResult } from "./projectRecord";
