import * as fixture from "../../fixtures";
import * as api from "./endpoints";
import { resolveSource, type DataNamespace } from "./source";

function pick<T>(namespace: DataNamespace, real: T, double: T): T {
  return resolveSource(namespace) === "api" ? real : double;
}

export const projectsAPI = pick<typeof fixture.projectsAPI>(
  "projects",
  api.projectsAPI,
  fixture.projectsAPI,
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

export const geoAPI = fixture.geoAPI;

export { announceFailure, failureSentence } from "./announce";
export { authAPI, readSession, sessionAPI } from "./endpoints";
export { API_BASE_URL, REQUEST_TIMEOUT_MS, http } from "./client";
export {
  FAILURE_MESSAGE_KEYS,
  failure,
  failureMessage,
  failureMessageKey,
  isAnnounceable,
  isApiFailure,
  isRetryable,
  toApiFailure,
} from "./errors";
export { hasSession, onSessionEvent } from "./tokens";
export { resolveSource } from "./source";
export type { DataNamespace, DataSource } from "./source";
