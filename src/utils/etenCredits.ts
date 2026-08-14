import type {
  EtenCreditEntry,
  EtenCreditSource,
  EtenYearReport,
} from "../types/eten";
import type { Project } from "../types/project";
import { parseIsoDate } from "./cadence";
import { getCountry } from "./region";

export const CREDIT_UNIT = "approvedUnits" as const;

export interface CreditAccount {
  approvedAtStart: number;
  approvedAtEnd: number;
  advanced: number;
  scopeUnits: number;
  concluded: boolean;
  completedInYear: boolean;
  undatedCompletion: boolean;
  hasData: boolean;
  credits: number | null;
  creditsSource: EtenCreditSource | null;
}

export type CountedProject = Pick<
  Project,
  "id" | "status" | "totalUnits" | "approvedUnits" | "progressHistory"
>;

export function approvedAtYearEnd(
  project: CountedProject,
  year: number,
  now: Date = new Date(),
): number | null {
  const upTo = project.progressHistory
    .map((entry) => ({ entry, date: parseIsoDate(entry.date) }))
    .filter((item) => item.date !== null && item.date.year <= year)
    .sort((a, b) => a.entry.date.localeCompare(b.entry.date));

  if (upTo.length > 0) {
    return upTo[upTo.length - 1].entry.approvedUnits;
  }
  if (year >= now.getFullYear()) return project.approvedUnits;
  return null;
}

export function accountFor(
  project: CountedProject,
  year: number,
  ledger: readonly EtenCreditEntry[] = [],
  now: Date = new Date(),
): CreditAccount {
  const startRead = approvedAtYearEnd(project, year - 1, now);
  const endRead = approvedAtYearEnd(project, year, now);
  const start = startRead ?? 0;
  const end = endRead ?? 0;
  const hasData = endRead !== null;
  const scopeUnits = project.totalUnits;
  const concluded = project.status === "concluido";

  const reachedByEnd = scopeUnits > 0 && end >= scopeUnits;
  const reachedByStart = scopeUnits > 0 && start >= scopeUnits;
  const completedInYear = reachedByEnd && !reachedByStart;
  const undatedCompletion = concluded && !reachedByEnd;

  const manual = ledger.find(
    (entry) => entry.projectId === project.id && entry.year === year,
  );
  const account: Omit<CreditAccount, "credits" | "creditsSource"> = {
    approvedAtStart: start,
    approvedAtEnd: end,
    advanced: Math.max(0, end - start),
    scopeUnits,
    concluded,
    completedInYear,
    undatedCompletion,
    hasData,
  };

  if (manual) {
    return { ...account, credits: manual.credits, creditsSource: "manual" };
  }
  if (undatedCompletion || !hasData) {
    return { ...account, credits: null, creditsSource: null };
  }
  return {
    ...account,
    credits: Number(completedInYear),
    creditsSource: "calculated",
  };
}

export function buildEtenReport(
  projects: readonly Project[],
  year: number,
  ledger: readonly EtenCreditEntry[] = [],
  now: Date = new Date(),
): EtenYearReport {
  const listed = projects.filter((project) => project.inETEN);

  const snapshots = listed
    .map((project) => ({
      projectId: project.id,
      languageName: project.languageName,
      country: getCountry(project),
      ...accountFor(project, year, ledger, now),
    }))
    .sort(
      (a, b) =>
        (b.credits ?? -1) - (a.credits ?? -1) ||
        b.advanced - a.advanced ||
        a.languageName.localeCompare(b.languageName),
    );

  return {
    year,
    listedProjects: listed.length,
    advancingProjects: snapshots.filter((snapshot) => snapshot.advanced > 0)
      .length,
    totalCredits: snapshots.reduce(
      (total, snapshot) => total + (snapshot.credits ?? 0),
      0,
    ),
    hasData: snapshots.some((snapshot) => snapshot.hasData),
    snapshots,
  };
}

export const REPORT_YEARS = 4;

export function reportYears(now: Date = new Date()): number[] {
  const latest = now.getFullYear();
  return Array.from({ length: REPORT_YEARS }, (_, step) => latest - step);
}

export function defaultReportYear(now: Date = new Date()): number {
  return now.getFullYear() - 1;
}
