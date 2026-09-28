import type {
  EtenCreditEntry,
  EtenCreditSource,
  EtenYearReport,
} from "../types/eten";
import type { Project } from "../types/project";
import { parseIsoDate, toCalendarDate, type CalendarDate } from "./cadence";
import { getCountryDisplay } from "./region";

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

/**
 * ETEN's fiscal year closes on 31 July (GATE-01, OBT-387, Karina, 22/set/2026; the cut on
 * 31/07 is Daniel's, 25/set). `year` is the fiscal year that **ends** on 31/07/`year`, so
 * 2026 runs from 01/08/2025 to 31/07/2026 — the same reading `shema-api`'s BE-11 takes
 * (`fiscal_year_of`, `FISCAL_YEAR_CLOSE`).
 */
export const FISCAL_YEAR_CLOSE = { month: 7, day: 31 } as const;

/**
 * The fiscal year a calendar day belongs to, compared **by field** and never through a `Date`:
 * 31 July closes one year and 1 August opens the next, in every timezone.
 */
export function fiscalYearOf(date: CalendarDate): number {
  const { month, day } = FISCAL_YEAR_CLOSE;
  const onOrBeforeClose =
    date.month < month || (date.month === month && date.day <= day);
  return onOrBeforeClose ? date.year : date.year + 1;
}

/** The last day a fiscal year covers, as ISO: `2026` → `2026-07-31`. */
export function fiscalYearEnd(year: number): string {
  const { month, day } = FISCAL_YEAR_CLOSE;
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** How a fiscal year is written on screen: `2026` → `2025/26`. */
export function fiscalYearSpan(year: number): string {
  return `${year - 1}/${String(year % 100).padStart(2, "0")}`;
}

export function approvedAtYearEnd(
  project: CountedProject,
  year: number,
  now: Date = new Date(),
): number | null {
  const upTo = project.progressHistory
    .map((entry) => ({ entry, date: parseIsoDate(entry.date) }))
    .filter((item) => item.date !== null && fiscalYearOf(item.date) <= year)
    .sort((a, b) => a.entry.date.localeCompare(b.entry.date));

  if (upTo.length > 0) {
    return upTo[upTo.length - 1].entry.approvedUnits;
  }
  if (year >= fiscalYearOf(toCalendarDate(now))) return project.approvedUnits;
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
    advanced: end - start,
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
      country: getCountryDisplay(project),
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

/** The fiscal year still open today — the report can be read, not yet sent. */
export function currentFiscalYear(now: Date = new Date()): number {
  return fiscalYearOf(toCalendarDate(now));
}

export function reportYears(now: Date = new Date()): number[] {
  const latest = currentFiscalYear(now);
  return Array.from({ length: REPORT_YEARS }, (_, step) => latest - step);
}

/** The last fiscal year that closed: in September 2026, the 2025/26 that closed on 31/07/2026. */
export function defaultReportYear(now: Date = new Date()): number {
  return currentFiscalYear(now) - 1;
}
