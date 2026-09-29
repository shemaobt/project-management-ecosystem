import type {
  EtenCompletionSource,
  EtenCreditEntry,
  EtenCreditSource,
  EtenManualEntry,
  EtenReading,
  EtenYearReport,
} from "../types/eten";
import type { ProgressHistoryEntry, Project } from "../types/project";
import {
  formatIsoDate,
  parseIsoDate,
  toCalendarDate,
  type CalendarDate,
} from "./cadence";
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
  startReading: EtenReading | null;
  endReading: EtenReading | null;
  completedDate: string | null;
  completionSource: EtenCompletionSource;
  approvedUnverified: boolean;
  manualEntry: EtenManualEntry | null;
}

export type CountedProject = Pick<
  Project,
  | "id"
  | "status"
  | "totalUnits"
  | "approvedUnits"
  | "progressHistory"
  | "completedDate"
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

/** The first day a fiscal year covers, as ISO: `2026` → `2025-08-01`, the day after the close. */
export function fiscalYearStart(year: number): string {
  const month = FISCAL_YEAR_CLOSE.month + 1;
  return `${year - 1}-${String(month).padStart(2, "0")}-01`;
}

/** How a fiscal year is written on screen: `2026` → `2025/26`. */
export function fiscalYearSpan(year: number): string {
  return `${year - 1}/${String(year % 100).padStart(2, "0")}`;
}

/**
 * The approved count at the close of fiscal `year`, and where it was read — BE-11's
 * `_reading`: the newest progress entry on or before the cut, or, for the year still open, the
 * record as it stands. A closed year with no entry has no reading, and `null` is that answer
 * rather than a zero.
 */
export function readingAtYearEnd(
  project: CountedProject,
  year: number,
  now: Date = new Date(),
): EtenReading | null {
  const upTo = datedHistory(project).filter(
    (item) => fiscalYearOf(item.date) <= year,
  );

  if (upTo.length > 0) {
    const { entry } = upTo[upTo.length - 1];
    return {
      source: "history",
      approvedUnits: entry.approvedUnits,
      totalUnits: entry.totalUnits ?? null,
      entryId: null,
      date: entry.date,
    };
  }
  if (year >= fiscalYearOf(toCalendarDate(now))) {
    return {
      source: "live",
      approvedUnits: project.approvedUnits,
      totalUnits: project.totalUnits,
      entryId: null,
      date: null,
    };
  }
  return null;
}

function datedHistory(project: CountedProject) {
  return project.progressHistory
    .map((entry) => ({ entry, date: parseIsoDate(entry.date) }))
    .filter(
      (item): item is { entry: ProgressHistoryEntry; date: CalendarDate } =>
        item.date !== null,
    )
    .sort((a, b) => a.entry.date.localeCompare(b.entry.date));
}

/**
 * A record whose first reading already met the scope arrived complete: the scope closed before
 * the product could see it, so crediting the year it was filed would be a plausible number and
 * a wrong one. BE-11's `_arrived_complete`, over the `initial` entry the record's create writes.
 */
function arrivedComplete(project: CountedProject): boolean {
  const [first] = datedHistory(project);
  return (
    first !== undefined &&
    first.entry.initial === true &&
    project.totalUnits > 0 &&
    first.entry.approvedUnits >= project.totalUnits
  );
}

/**
 * The completion date that decides the year, when there is one — FE-51's first source. Dropped
 * when the readings show the scope already met at the start of that date's year: the scope
 * closed earlier, a report already credited it from the readings, and the status set later is
 * a late recording.
 */
function stampedCompletion(
  project: CountedProject,
  now: Date,
): CalendarDate | null {
  if (project.status !== "concluido" || project.totalUnits <= 0) return null;
  const stamped = parseIsoDate(project.completedDate ?? "");
  if (!stamped) return null;
  const before = readingAtYearEnd(project, fiscalYearOf(stamped) - 1, now);
  return before !== null && before.approvedUnits >= project.totalUnits
    ? null
    : stamped;
}

/**
 * One project, one fiscal year, and the working behind the figure — `shema-api`'s
 * `account_for`, which owns the rule in `api` mode. This copy is the fixture double's: it has
 * to answer what the server answers so the screen can be worked on with no backend.
 *
 * **Two sources for the year.** A `concluido` project with a `completedDate` and a defined
 * scope is credited in that date's fiscal year; otherwise the approved count crossing the scope
 * between the two cuts decides. **The credit**: a manual entry wins; a stamped completion in the
 * year earns 1 even with no reading; an undated completion, or a year with no reading, earns
 * `null` — a year with no data is not a year of zero credits.
 *
 * One fact only the server sees is not reproduced: a count still copied from the Notion export
 * (`approved_units_unverified`), which the console's `Project` does not carry.
 */
export function accountFor(
  project: CountedProject,
  year: number,
  ledger: readonly EtenCreditEntry[] = [],
  now: Date = new Date(),
): CreditAccount {
  const startReading = readingAtYearEnd(project, year - 1, now);
  const endReading = readingAtYearEnd(project, year, now);
  const start = startReading?.approvedUnits ?? 0;
  const end = endReading?.approvedUnits ?? 0;
  const hasData = endReading !== null;
  const scopeUnits = project.totalUnits;
  const concluded = project.status === "concluido";

  const reachedByEnd = scopeUnits > 0 && end >= scopeUnits;
  const reachedByStart = scopeUnits > 0 && start >= scopeUnits;

  const stamped = stampedCompletion(project, now);
  let completedInYear: boolean;
  let undatedCompletion: boolean;
  if (stamped) {
    completedInYear = fiscalYearOf(stamped) === year;
    undatedCompletion = false;
  } else {
    const crossed = reachedByEnd && !reachedByStart;
    const arrived = crossed && startReading === null && arrivedComplete(project);
    completedInYear = crossed && !arrived;
    undatedCompletion = (concluded && !reachedByEnd) || arrived;
  }

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
    startReading,
    endReading,
    completedDate: project.completedDate || null,
    completionSource: stamped ? "completedDate" : "snapshots",
    approvedUnverified: false,
    manualEntry: manual
      ? {
          credits: manual.credits,
          recordedBy: manual.recordedBy,
          recordedAt: manual.recordedAt,
        }
      : null,
  };

  if (manual) {
    return { ...account, credits: manual.credits, creditsSource: "manual" };
  }
  if (stamped && completedInYear) {
    return { ...account, credits: 1, creditsSource: "calculated" };
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

/**
 * The report the fixture double answers for `GET /eten/report` — the same order, totals and
 * provenance fields the server fills. Nothing recorded it, so `reportId` and `recordedAt` are
 * `null`, and the screen says so rather than inventing a record.
 */
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
        a.languageName.localeCompare(b.languageName) ||
        a.projectId.localeCompare(b.projectId),
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
    hasData: snapshots.some(
      (snapshot) => snapshot.hasData || snapshot.credits !== null,
    ),
    snapshots,
    periodStart: fiscalYearStart(year),
    periodEnd: fiscalYearEnd(year),
    asOf: formatIsoDate(toCalendarDate(now)),
    reportId: null,
    recordedAt: null,
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
