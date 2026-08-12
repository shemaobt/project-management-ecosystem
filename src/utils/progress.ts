import { EXPLICIT_PROJECT_STATUSES } from "../constants/project";
import type {
  BookProgressItem,
  OtherProgressItem,
  ProgressCountKey,
  ProgressDeltas,
  ProgressHistoryEntry,
  ProgressRollup,
  ProgressSnapshot,
  Project,
  ProjectStatus,
} from "../types/project";

type CountedProgressItem = BookProgressItem | OtherProgressItem;

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
  const items: CountedProgressItem[] = [
    ...project.bookProgress,
    ...(project.otherProgress ?? []),
  ];
  if (items.length === 0) return null;

  return items.reduce<ProgressRollup>(
    (acc, item) => ({
      total: acc.total + toNumber(item.chapters),
      translated: acc.translated + toNumber(item.translated),
      community: acc.community + toNumber(item.communityChecked),
      approved: acc.approved + toNumber(item.mentorApproved),
    }),
    { translated: 0, community: 0, approved: 0, total: 0 },
  );
}

function snapshotEntry(project: Project, date: string): ProgressHistoryEntry {
  return {
    date,
    translatedUnits: project.translatedUnits,
    communityCheckedUnits: project.communityCheckedUnits,
    approvedUnits: project.approvedUnits,
    totalUnits: project.totalUnits,
    bookProgress: project.bookProgress.map((row) => ({ ...row })),
    storyProgress: project.storyProgress.map((row) => ({ ...row })),
    otherProgress: (project.otherProgress ?? []).map((row) => ({ ...row })),
  };
}

export type ProgressEntrySource = Pick<
  ProgressHistoryEntry,
  "fromField" | "formType"
>;

export function applyProgressUpdate(
  previous: Project | null,
  next: Project,
  date: string,
  source?: ProgressEntrySource,
): Project {
  const roll = rollUpProgress(next);
  const updated: Project = roll
    ? {
        ...next,
        translatedUnits: roll.translated,
        communityCheckedUnits: roll.community,
        approvedUnits: roll.approved,
        totalUnits: roll.total > 0 ? roll.total : next.totalUnits,
      }
    : { ...next };

  const history = [...(previous ?? updated).progressHistory];

  if (previous) {
    const changed =
      previous.translatedUnits !== updated.translatedUnits ||
      previous.communityCheckedUnits !== updated.communityCheckedUnits ||
      previous.approvedUnits !== updated.approvedUnits ||
      previous.totalUnits !== updated.totalUnits;
    if (changed) {
      history.push({
        ...snapshotEntry(updated, date),
        previousTranslated: previous.translatedUnits,
        previousCommunity: previous.communityCheckedUnits,
        previousApproved: previous.approvedUnits,
        ...source,
      });
    }
  } else if (
    updated.translatedUnits > 0 ||
    updated.communityCheckedUnits > 0 ||
    updated.approvedUnits > 0
  ) {
    history.push({ ...snapshotEntry(updated, date), initial: true, ...source });
  }

  return { ...updated, progressHistory: history };
}

export function progressAsOf(
  project: Project,
  date: string,
): ProgressSnapshot | null {
  let latest: ProgressHistoryEntry | null = null;
  for (const entry of project.progressHistory) {
    if (entry.date <= date && (!latest || entry.date >= latest.date)) {
      latest = entry;
    }
  }
  if (!latest) return null;

  return {
    date: latest.date,
    translatedUnits: latest.translatedUnits,
    communityCheckedUnits: latest.communityCheckedUnits,
    approvedUnits: latest.approvedUnits,
    totalUnits: latest.totalUnits ?? null,
    bookProgress: latest.bookProgress ?? null,
    storyProgress: latest.storyProgress ?? null,
    otherProgress: latest.otherProgress ?? null,
  };
}

export function historyDeltas(entry: ProgressHistoryEntry): ProgressDeltas {
  return {
    translated:
      entry.previousTranslated !== undefined
        ? entry.translatedUnits - entry.previousTranslated
        : 0,
    community:
      entry.previousCommunity !== undefined
        ? entry.communityCheckedUnits - entry.previousCommunity
        : 0,
    approved:
      entry.previousApproved !== undefined
        ? entry.approvedUnits - entry.previousApproved
        : 0,
  };
}

export function decreasedCounts(project: Project): ProgressCountKey[] {
  const roll = rollUpProgress(project);
  if (!roll) return [];

  const drops: ProgressCountKey[] = [];
  if (roll.translated < project.translatedUnits) drops.push("translated");
  if (roll.community < project.communityCheckedUnits) drops.push("community");
  if (roll.approved < project.approvedUnits) drops.push("approved");
  return drops;
}
