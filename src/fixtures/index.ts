import type { EtenCreditEntry, EtenYearReport } from "../types/eten";
import type { ReceivedSubmission } from "../types/forms";
import type { MeetingDefinition, MeetingLogEntry } from "../types/meeting";
import type { Intercessor, PrayerRequest } from "../types/prayer";
import type { Project } from "../types/project";
import type { GeoOutline, Region } from "../types/region";
import { createEmptyProject } from "./blank";
import { loadEtenCredits } from "./eten";
import { loadReceivedSubmissions } from "./forms";
import { loadContinentOutlines } from "./geo";
import { buildEtenReport } from "../utils/etenCredits";
import { loadIntercessors } from "./intercessors";
import { loadMeetingLog, loadMeetings } from "./meetings";
import { buildPrayerRequests } from "../utils/prayer";
import { loadProject, loadProjects } from "./projects";
import { loadRegions } from "./regions";

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
  async list(): Promise<Intercessor[]> {
    return loadIntercessors();
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
