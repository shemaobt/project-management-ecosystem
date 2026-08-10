import type { SortKey } from "../../../constants/sorting";
import type { Project } from "../../../types/project";
import { healthScore } from "../../../utils/health";
import { getProgress } from "../../../utils/progress";

type Comparator = (a: Project, b: Project) => number;

function blanksLast(
  pick: (project: Project) => string,
  compare: (a: string, b: string) => number,
): Comparator {
  return (a, b) => {
    const left = pick(a);
    const right = pick(b);
    if (!left || !right) return left === right ? 0 : left ? -1 : 1;
    return compare(left, right);
  };
}

function ascendingIsoDate(a: string, b: string): number {
  if (a < b) return -1;
  return a > b ? 1 : 0;
}

function comparatorFor(key: SortKey, locale: string): Comparator {
  const collate = (a: string, b: string) => a.localeCompare(b, locale);
  switch (key) {
    case "deadline":
      return blanksLast((project) => project.deadline, ascendingIsoDate);
    case "name":
      return blanksLast((project) => project.languageName, collate);
    case "team":
      return blanksLast((project) => project.team, collate);
    case "progress":
      return (a, b) => getProgress(b) - getProgress(a);
    case "health":
      return (a, b) => healthScore(b) - healthScore(a);
  }
}

export function sortProjects(
  projects: readonly Project[],
  key: SortKey,
  locale: string,
): Project[] {
  return [...projects].sort(comparatorFor(key, locale));
}
