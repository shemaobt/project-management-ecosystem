import { EXPLICIT_PROJECT_STATUSES } from "../constants/project";
import type {
  BookProgressItem,
  OtherProgressItem,
  ProgressRollup,
  Project,
  ProjectStatus,
  StoryProgressItem,
} from "../types/project";

type ProgressUnit = BookProgressItem | StoryProgressItem | OtherProgressItem;

const toNumber = (value: unknown): number => Number(value) || 0;

export function getProgress(project: Project): number {
  return project.totalUnits > 0
    ? (project.translatedUnits / project.totalUnits) * 100
    : 0;
}

export function getProjectStatus(project: Project): ProjectStatus {
  if (EXPLICIT_PROJECT_STATUSES.includes(project.status)) {
    return project.status;
  }

  const progress = getProgress(project);
  if (progress === 0) return "nao-iniciado";
  if (progress === 100) return "concluido";
  if (progress >= 75) return "final";
  return "em-andamento";
}

export function rollUpProgress(project: Project): ProgressRollup | null {
  const items: ProgressUnit[] = [
    ...project.bookProgress,
    ...project.storyProgress,
    ...(project.otherProgress ?? []),
  ];
  if (items.length === 0) return null;

  return items.reduce<ProgressRollup>(
    (acc, item) => ({
      total: acc.total + ("chapters" in item ? toNumber(item.chapters) : 0),
      translated:
        acc.translated + ("translated" in item ? toNumber(item.translated) : 0),
      community:
        acc.community +
        ("communityChecked" in item ? toNumber(item.communityChecked) : 0),
      approved:
        acc.approved +
        ("mentorApproved" in item ? toNumber(item.mentorApproved) : 0),
    }),
    { translated: 0, community: 0, approved: 0, total: 0 },
  );
}
