import type { EtenCreditEntry, EtenYearReport } from "../types/eten";
import type { ReceivedSubmission } from "../types/forms";
import type { MeetingDefinition, MeetingLogEntry } from "../types/meeting";
import type {
  ConsentContext,
  IntercessorCreate,
  IntercessorDirectory,
  IntercessorEntry,
  IntercessorUpdatePayload,
  PrayerRequest,
} from "../types/prayer";
import type { Project } from "../types/project";
import type { GeoOutline, Region, RegionKey, RegionTeam, RoleChange } from "../types/region";
import type { SaveOutcome } from "../types/team";
import { createEmptyProject } from "./blank";
import { loadEtenCredits } from "./eten";
import { loadReceivedSubmissions } from "./forms";
import { loadContinentOutlines } from "./geo";
import { buildEtenReport } from "../utils/etenCredits";
import {
  createIntercessor,
  grantConsent,
  loadIntercessors,
  removeIntercessor,
  revealContact,
  updateIntercessor,
} from "./intercessors";
import { loadMeetingLog, loadMeetings } from "./meetings";
import { buildPrayerRequests } from "../utils/prayer";
import { loadProject, loadProjects } from "./projects";
import { loadRegions, loadRoleChanges, saveTeam } from "./regions";

export const projectsAPI = {
  async list(): Promise<Project[]> {
    return loadProjects();
  },
  async get(id: string): Promise<Project | null> {
    return loadProject(id);
  },
};

export const regionsAPI = {
  async list(): Promise<Region[]> {
    return loadRegions();
  },
  async saveTeam(
    regionKey: RegionKey,
    from: RegionTeam,
    to: RegionTeam,
    changedBy: string,
    now: Date,
  ): Promise<{ outcome: SaveOutcome; changes: RoleChange[] }> {
    return saveTeam(regionKey, from, to, changedBy, now);
  },
  async roleChanges(): Promise<RoleChange[]> {
    return loadRoleChanges();
  },
};

export const meetingsAPI = {
  async list(): Promise<MeetingDefinition[]> {
    return loadMeetings();
  },
  async log(): Promise<MeetingLogEntry[]> {
    return loadMeetingLog();
  },
};

export const prayerAPI = {
  async list(): Promise<PrayerRequest[]> {
    return buildPrayerRequests(loadProjects());
  },
};

export const intercessorsAPI = {
  async list(): Promise<IntercessorDirectory> {
    return loadIntercessors();
  },
  async create(payload: IntercessorCreate): Promise<IntercessorEntry> {
    return createIntercessor(payload);
  },
  async update(
    id: string,
    payload: IntercessorUpdatePayload,
  ): Promise<IntercessorEntry> {
    return updateIntercessor(id, payload);
  },
  async remove(id: string): Promise<void> {
    return removeIntercessor(id);
  },
  async contact(id: string): Promise<string> {
    return revealContact(id);
  },
  async grantConsent(
    id: string,
    context: ConsentContext,
    basis: string,
  ): Promise<IntercessorEntry> {
    return grantConsent(id, context, basis);
  },
};

export const etenAPI = {
  async report(year: number): Promise<EtenYearReport> {
    return buildEtenReport(loadProjects(), year, loadEtenCredits());
  },
  async credits(): Promise<EtenCreditEntry[]> {
    return loadEtenCredits();
  },
};

export const formsAPI = {
  async received(): Promise<ReceivedSubmission[]> {
    return loadReceivedSubmissions();
  },
};

export const geoAPI = {
  async outlines(): Promise<GeoOutline[]> {
    return loadContinentOutlines();
  },
};

export { createEmptyProject };

export const fixtures = {
  projects: projectsAPI,
  regions: regionsAPI,
  meetings: meetingsAPI,
  prayer: prayerAPI,
  intercessors: intercessorsAPI,
  eten: etenAPI,
  geo: geoAPI,
};
