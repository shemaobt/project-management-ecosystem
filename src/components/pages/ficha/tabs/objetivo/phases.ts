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
