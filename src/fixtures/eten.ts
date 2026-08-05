import type { EtenCreditEntry, EtenYearReport } from "../types/eten";
import type { Project } from "../types/project";
import { getCountry } from "../utils/region";

const etenCredits: EtenCreditEntry[] = [];

export function loadEtenCredits(): EtenCreditEntry[] {
  return structuredClone(etenCredits);
}

export function translatedUnitsAtYearEnd(
  project: Project,
  year: number,
  now: Date = new Date(),
): number {
  const cutoff = new Date(year, 11, 31, 23, 59, 59);
  const history = project.progressHistory.filter(
    (entry) => entry.date && new Date(entry.date) <= cutoff,
  );

  if (history.length > 0) {
    const sorted = [...history].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    );
    return sorted[sorted.length - 1].translatedUnits || 0;
  }

  if (year >= now.getFullYear()) return project.translatedUnits;
  return 0;
}

export function buildEtenReport(
  projects: Project[],
  year: number,
  credits: EtenCreditEntry[] = etenCredits,
  now: Date = new Date(),
): EtenYearReport {
  const listed = projects.filter((project) => project.inETEN);
  const creditsByProject = new Map(
    credits
      .filter((entry) => entry.year === year)
      .map((entry) => [entry.projectId, entry]),
  );

  const snapshots = listed.map((project) => {
    const entry = creditsByProject.get(project.id);
    return {
      projectId: project.id,
      languageName: project.languageName,
      country: getCountry(project),
      totalUnits: project.totalUnits,
      translatedUnitsAtPreviousYearEnd: translatedUnitsAtYearEnd(
        project,
        year - 1,
        now,
      ),
      translatedUnitsAtYearEnd: translatedUnitsAtYearEnd(project, year, now),
      credits: entry ? entry.credits : null,
      creditsSource: entry ? entry.source : null,
    };
  });

  return {
    year,
    listedProjects: listed.length,
    totalCredits: snapshots.reduce(
      (total, snapshot) => total + (snapshot.credits ?? 0),
      0,
    ),
    snapshots,
  };
}
