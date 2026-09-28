import { REGIONS } from "../constants/regions";
import type { LocationDisplay, RegionKey } from "../types/region";
import type { Project } from "../types/project";
import { parseIsoDate, toCalendarDate } from "./cadence";
import { getLeavingLocation, getRegion } from "./region";

/**
 * The annual report GATE-02 turned the Celebration into (OBT-388, Karina, 22/set/2026):
 * *"um relatório geral de tudo o que foi feito durante o ano … quantos projetos iniciaram,
 * quantos finalizaram"*. FE-50 (OBT-533).
 *
 * **The year is the calendar year** until Karina answers — she named the fiscal year for ETEN
 * and said nothing for the Celebration, so the screen says which one it is. **There is no
 * goals section**: the product has no model of a goal, and a section with nothing behind it
 * would be the fabricated surface the report exists to avoid.
 */

export interface ReportedProject {
  id: string;
  languageName: string;
  /** Read through the redaction owner: a sensitive project shows its region, never its country. */
  location: LocationDisplay;
}

export interface AnnualRegion {
  region: RegionKey;
  started: ReportedProject[];
  finished: ReportedProject[];
}

export interface AnnualReport {
  year: number;
  started: number;
  finished: number;
  /**
   * `concluido` projects with no completion date. They finished, but nothing says when, so
   * they are left out of every year and counted here instead of silently disappearing.
   */
  finishedUndated: number;
  /**
   * Whether any project carries a date that could place it in a year. With none, the year
   * has **no data** — which is not a year of zero projects started and finished.
   */
  hasData: boolean;
  regions: AnnualRegion[];
}

function yearOf(date: string | undefined): number | null {
  if (!date) return null;
  return parseIsoDate(date)?.year ?? null;
}

/**
 * The report is a summary of the year that leaves the room, so a sensitive project's line
 * is withheld whoever reads — FE-48's per-reader rule is for cards and the record, not for
 * what leaves (§6.1). The line carries the place only, never the base.
 */
function reportedLocation(project: Project): LocationDisplay {
  const place = getLeavingLocation(project);
  return place.withheld
    ? { withheld: true, regionLabelKey: place.regionLabelKey }
    : { withheld: false, location: place.location };
}

function reported(project: Project): ReportedProject {
  return {
    id: project.id,
    languageName: project.languageName,
    location: reportedLocation(project),
  };
}

export function buildAnnualReport(
  projects: readonly Project[],
  year: number,
): AnnualReport {
  const byRegion = new Map<RegionKey, AnnualRegion>();
  const bucket = (project: Project): AnnualRegion => {
    const region = getRegion(project);
    const existing = byRegion.get(region);
    if (existing) return existing;
    const created: AnnualRegion = { region, started: [], finished: [] };
    byRegion.set(region, created);
    return created;
  };

  let finishedUndated = 0;
  let hasData = false;

  for (const project of projects) {
    const startYear = yearOf(project.startDate);
    const endYear = yearOf(project.completedDate);
    if (startYear !== null || endYear !== null) hasData = true;

    if (startYear === year) bucket(project).started.push(reported(project));
    if (endYear === year) bucket(project).finished.push(reported(project));
    if (project.status === "concluido" && endYear === null) finishedUndated += 1;
  }

  const byName = (a: ReportedProject, b: ReportedProject) =>
    a.languageName.localeCompare(b.languageName);
  const regions = REGIONS.map((definition) => byRegion.get(definition.key))
    .filter((entry): entry is AnnualRegion => entry !== undefined)
    .map((entry) => ({
      ...entry,
      started: [...entry.started].sort(byName),
      finished: [...entry.finished].sort(byName),
    }));

  return {
    year,
    started: regions.reduce((total, entry) => total + entry.started.length, 0),
    finished: regions.reduce((total, entry) => total + entry.finished.length, 0),
    finishedUndated,
    hasData,
    regions,
  };
}

export const ANNUAL_REPORT_YEARS = 4;

/** The last calendar year that closed — the Celebration looks back on a whole year. */
export function defaultAnnualYear(now: Date = new Date()): number {
  return toCalendarDate(now).year - 1;
}

export function annualReportYears(now: Date = new Date()): number[] {
  const latest = toCalendarDate(now).year;
  return Array.from({ length: ANNUAL_REPORT_YEARS }, (_, step) => latest - step);
}

/**
 * The year an address asks for, or `null` when the selector does not offer it — an old shared
 * link, a typo. The page redirects on `null`: titling it with a year the `Select` has no item
 * for leaves the trigger empty (PR #64 review).
 */
export function offeredYear(
  param: string | undefined,
  now: Date = new Date(),
): number | null {
  if (!param || !/^\d{4}$/u.test(param)) return null;
  const year = Number(param);
  return annualReportYears(now).includes(year) ? year : null;
}
