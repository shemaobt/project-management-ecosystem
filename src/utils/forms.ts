import { FIELD_FORMS } from "../constants/forms";
import type {
  FormDefinition,
  FormKind,
  FormReadiness,
  PendingProject,
  ProjectReporting,
  ReportingState,
} from "../types/forms";
import type { Project } from "../types/project";
import { formatIsoDate, parseIsoDate, periodEnd, toCalendarDate } from "./cadence";
import { isAssessed } from "./health";
import { getRegion, getRegionLabelKey } from "./region";
import { hasReported } from "./rhythm";

export function formOf(kind: FormKind): FormDefinition {
  const form = FIELD_FORMS.find((candidate) => candidate.kind === kind);
  if (!form) throw new Error(`unknown form: ${kind}`);
  return form;
}

function lastReportDate(kind: FormKind, project: Project): string | null {
  if (kind === "pulso") {
    return parseIsoDate(project.lastUpdated) ? project.lastUpdated : null;
  }
  if (!isAssessed(project)) return null;
  return parseIsoDate(project.healthAssessmentDate)
    ? project.healthAssessmentDate
    : null;
}

export function reportingFor(
  form: FormDefinition,
  project: Project,
  now: Date = new Date(),
): ProjectReporting {
  const today = toCalendarDate(now);
  const lastDate = lastReportDate(form.kind, project);
  const state: ReportingState = hasReported(
    form.kind,
    project,
    form.cadence,
    today,
  )
    ? "reported"
    : lastDate === null
      ? "never"
      : "awaiting";

  return {
    state,
    lastDate,
    periodEnd: formatIsoDate(periodEnd(form.cadence, today)),
  };
}

function silentFirst(a: PendingProject, b: PendingProject): number {
  if (a.lastDate === null && b.lastDate === null) {
    return a.languageName.localeCompare(b.languageName);
  }
  if (a.lastDate === null) return -1;
  if (b.lastDate === null) return 1;
  return (
    a.lastDate.localeCompare(b.lastDate) ||
    a.languageName.localeCompare(b.languageName)
  );
}

export function formReadiness(
  form: FormDefinition,
  projects: readonly Project[],
  now: Date = new Date(),
): FormReadiness {
  const today = toCalendarDate(now);
  const pending = projects
    .filter((project) => !hasReported(form.kind, project, form.cadence, today))
    .map((project) => ({
      id: project.id,
      languageName: project.languageName,
      regionLabelKey: getRegionLabelKey(getRegion(project)),
      lastDate: lastReportDate(form.kind, project),
    }))
    .sort(silentFirst);

  return {
    reported: projects.length - pending.length,
    total: projects.length,
    periodEnd: formatIsoDate(periodEnd(form.cadence, today)),
    pending,
  };
}

export function selectableProjects(projects: readonly Project[]): Project[] {
  return [...projects].sort((a, b) =>
    a.languageName.localeCompare(b.languageName),
  );
}
