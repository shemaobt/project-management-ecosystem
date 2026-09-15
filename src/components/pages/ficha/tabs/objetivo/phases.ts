import type { ProjectPhase } from "../../../../../types/project";

export function phaseTitle(
  phase: ProjectPhase,
  index: number,
  phaseWord: string,
): string {
  return phase.label || `${phaseWord} ${index + 1}`;
}

export function appendPhase(phases: readonly ProjectPhase[]): ProjectPhase[] {
  return [...phases, { label: "", scope: "", date: "" }];
}

export function patchPhase(
  phases: readonly ProjectPhase[],
  index: number,
  part: Partial<ProjectPhase>,
): ProjectPhase[] {
  return phases.map((phase, position) =>
    position === index ? { ...phase, ...part } : phase,
  );
}

export function removePhase(
  phases: readonly ProjectPhase[],
  index: number,
): ProjectPhase[] {
  return phases.filter((_, position) => position !== index);
}

/**
 * A phase's `date` is a free string on the record, and that is not an oversight: *"2º
 * semestre"* is a real answer to *when*, and the export carries answers like it. The
 * console's own editor writes an ISO day, so both shapes reach this screen — and a
 * phrase run through `formatDate` renders "Invalid Date", which is how integration
 * turns a field team's answer into a bug report.
 */
export const isCalendarDay = (value: string): boolean =>
  /^\d{4}-\d{2}-\d{2}$/u.test(value);
