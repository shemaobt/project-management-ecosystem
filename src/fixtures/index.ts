import type { EtenCreditEntry, EtenYearReport } from "../types/eten";
import type {
  IntakeForm,
  IntakeImageStored,
  IntakeLink,
  IntakeLinkCreatePayload,
  IntakeLinkCreated,
  IntakeSubmissionPayload,
  ReceivedSubmission,
  ReceivedSubmissionDetail,
} from "../types/forms";
import type {
  MeetingId,
  MeetingLogEntry,
  MeetingLogPayload,
} from "../types/meeting";
import type {
  ConsentContext,
  IntercessorCreate,
  IntercessorDirectory,
  IntercessorEntry,
  IntercessorUpdatePayload,
  PrayerRequest,
} from "../types/prayer";
import type { Project, ProjectMember, ProjectRef } from "../types/project";
import type { LoadedRecord } from "../types/projectRecord";
import type { RecordSaveResult } from "../services/api/projectRecord";
import type { GeoOutline, Region, RegionKey, RegionTeam, RoleChange } from "../types/region";
import type { SaveOutcome } from "../types/team";
import type {
  ProjectBrowseQuery,
  ProjectBrowseResult,
} from "../types/projectBrowse";
import { createEmptyProject } from "./blank";
import { loadEtenCredits } from "./eten";
import {
  listIntakeLinks,
  loadReceivedSubmissions,
  mintIntakeLink,
  readIntakeForm,
  readSubmission,
  revokeIntakeLink,
  submitIntake,
  uploadIntakeImage,
} from "./forms";
import { loadContinentOutlines } from "./geo";
import { buildEtenReport } from "../utils/etenCredits";
import {
  createIntercessor,
  grantConsent,
  leaveThroughExitLink,
  loadIntercessors,
  openExitLink,
  removeIntercessor,
  revealContact,
  reviewIntercessor,
  updateIntercessor,
} from "./intercessors";
import { loadMeetingLog, logMeetingEntry, undoMeetingEntry } from "./meetings";
import { listMembers, myProjects, refuseRosterWrite } from "./members";
import { buildPrayerRequests } from "../utils/prayer";
import type { AssessmentDraft } from "../types/assessment";
import { browseProjects } from "./projectBrowse";
import { loadProject, loadProjects } from "./projects";
import {
  createRecord,
  patchRecord,
  readRecord,
  submitAssessment,
} from "./projectRecord";
import { loadRegions, loadRoleChanges, saveTeam } from "./regions";

export {
  MOCK_SESSION_KEY,
  MOCK_SESSION_PERSONAS,
  readMockRole,
  type MockPersona,
} from "./session";

export const projectsAPI = {
  async list(): Promise<Project[]> {
    return loadProjects();
  },
  async get(id: string): Promise<Project | null> {
    return loadProject(id);
  },
};

/**
 * The ficha's own capability — one record, its version, and the writes that quote it.
 * See `fixtures/projectRecord.ts` for why this double remembers what it is told.
 */
export const projectRecordAPI = {
  async read(id: string): Promise<LoadedRecord> {
    return readRecord(id);
  },
  async create(project: Project): Promise<RecordSaveResult> {
    return createRecord(project);
  },
  async patch(
    id: string,
    patch: Record<string, unknown>,
    version: string,
  ): Promise<RecordSaveResult> {
    return patchRecord(id, patch, version);
  },
};

/** The wizard's own capability — one reading filed, the record it landed on. */
export const healthAssessmentsAPI = {
  async submit(
    id: string,
    draft: AssessmentDraft,
    actorName: string,
  ): Promise<RecordSaveResult> {
    return submitAssessment(id, draft, actorName);
  },
};

/** The Projetos screen's own capability — see `types/projectBrowse.ts`. */
export const projectBrowseAPI = {
  async browse(query: ProjectBrowseQuery): Promise<ProjectBrowseResult> {
    return browseProjects(query);
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
  async log(): Promise<MeetingLogEntry[]> {
    return loadMeetingLog();
  },
  async logMeeting(payload: MeetingLogPayload): Promise<MeetingLogEntry> {
    return logMeetingEntry(payload);
  },
  async undo(
    meetingId: MeetingId,
    scopeKey: RegionKey,
    period: string,
  ): Promise<void> {
    undoMeetingEntry(meetingId, scopeKey, period);
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
  async review(id: string): Promise<IntercessorEntry> {
    return reviewIntercessor(id);
  },
  async exitLink(token: string): Promise<void> {
    return openExitLink(token);
  },
  async leave(token: string): Promise<void> {
    return leaveThroughExitLink(token);
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
  async mintIntakeLink(
    payload: IntakeLinkCreatePayload,
  ): Promise<IntakeLinkCreated> {
    return mintIntakeLink(payload);
  },
  async listIntakeLinks(projectId?: string): Promise<IntakeLink[]> {
    return listIntakeLinks(projectId);
  },
  async revokeIntakeLink(linkId: string): Promise<IntakeLink> {
    return revokeIntakeLink(linkId);
  },
  async intakeForm(token: string): Promise<IntakeForm> {
    return readIntakeForm(token);
  },
  async submitIntake(
    token: string,
    payload: IntakeSubmissionPayload,
  ): Promise<void> {
    return submitIntake(token, payload);
  },
  async uploadIntakeImage(
    token: string,
    image: Blob,
    fileName: string,
  ): Promise<IntakeImageStored> {
    return uploadIntakeImage(token, image, fileName);
  },
  async readSubmission(submissionId: string): Promise<ReceivedSubmissionDetail> {
    return readSubmission(submissionId);
  },
};

/** The project's roster and the account's own projects — see `fixtures/members.ts`. */
export const membersAPI = {
  async list(projectId: string): Promise<ProjectMember[]> {
    return listMembers(projectId);
  },
  async add(projectId: string, userId: string): Promise<ProjectMember> {
    return refuseRosterWrite(projectId, userId);
  },
  async remove(projectId: string, userId: string): Promise<void> {
    return refuseRosterWrite(projectId, userId);
  },
  async mine(): Promise<ProjectRef[]> {
    return myProjects();
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
