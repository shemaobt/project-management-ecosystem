import type { TFunction } from "i18next";
import type {
  MediaAudience,
  Objective,
  OverallHealth,
  Project,
  ProjectStatus,
  TranslationType,
} from "../types/project";
import { getOverallHealth } from "./health";
import { openNeeds } from "./needs";
import { canExportNotes } from "./notes";
import { buildPrayerRequests } from "./prayer";
import { getProjectStatus } from "./progress";
import { getLocationDisplay } from "./region";

export const EXPORT_AUDIENCE: MediaAudience = "publico";

export interface ExportedProject {
  id: string;
  languageName: string;
  languageCode: string;
  bridgeLanguage: string;
  vitalityStatus: string;
  speakerCount: string;
  base: string;
  location: string;
  locationWithheld: boolean;
  sensitiveCountry: boolean;
  objective: Objective[];
  translationType: TranslationType[];
  status: ProjectStatus;
  startDate: string;
  deadline: string;
  translatedUnits: number;
  communityCheckedUnits: number;
  approvedUnits: number;
  totalUnits: number;
  overallHealth: OverallHealth;
  openNeeds: number;
  sharedPrayerRequests: string[];
  lastUpdated: string;
  notes?: string;
}

export function redactProjectForExport(
  project: Project,
  t: TFunction,
): ExportedProject {
  const display = getLocationDisplay(project);
  return {
    id: project.id,
    languageName: project.languageName,
    languageCode: project.languageCode,
    bridgeLanguage: project.bridgeLanguage,
    vitalityStatus: project.vitalityStatus,
    speakerCount: project.speakerCount,
    base: project.team || project.ywamBase,
    location: display.withheld ? t(display.regionLabelKey) : display.location,
    locationWithheld: display.withheld,
    sensitiveCountry: project.sensitiveCountry,
    objective: project.objective,
    translationType: project.translationType,
    status: getProjectStatus(project),
    startDate: project.startDate,
    deadline: project.deadline,
    translatedUnits: project.translatedUnits,
    communityCheckedUnits: project.communityCheckedUnits,
    approvedUnits: project.approvedUnits,
    totalUnits: project.totalUnits,
    overallHealth: getOverallHealth(project),
    openNeeds: openNeeds(project.needsItems).length,
    sharedPrayerRequests: buildPrayerRequests([project])
      .map((request) => request.text)
      .filter((text) => text !== ""),
    lastUpdated: project.lastUpdated,
    ...(canExportNotes(EXPORT_AUDIENCE) ? { notes: project.notes } : {}),
  };
}

export function redactProjectsForExport(
  projects: readonly Project[],
  t: TFunction,
): ExportedProject[] {
  return projects.map((project) => redactProjectForExport(project, t));
}

export function countWithheldLocations(
  records: readonly ExportedProject[],
): number {
  return records.filter((record) => record.locationWithheld).length;
}
