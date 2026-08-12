import {
  BOOK_PROGRESS_OBJECTIVES,
  OTHER_PROGRESS_OBJECTIVE,
  OTHER_PROGRESS_TRANSLATION_TYPES,
  STORY_PROGRESS_OBJECTIVE,
} from "../../../../../constants/project";
import type {
  BibleBook,
  BookProgressItem,
  OtherProgressItem,
  ProgressCountKey,
  Project,
  ProjectStatus,
  StoryProgressItem,
} from "../../../../../types/project";

export type ScopeFields = Pick<Project, "objective" | "translationType">;

export function showsBookTable({ objective }: ScopeFields): boolean {
  return objective.some((value) => BOOK_PROGRESS_OBJECTIVES.includes(value));
}

export function showsStoryTable({ objective }: ScopeFields): boolean {
  return objective.includes(STORY_PROGRESS_OBJECTIVE);
}

export function showsOtherTable({
  objective,
  translationType,
}: ScopeFields): boolean {
  return (
    objective.includes(OTHER_PROGRESS_OBJECTIVE) ||
    translationType.some((value) =>
      OTHER_PROGRESS_TRANSLATION_TYPES.includes(value),
    )
  );
}

export type ProgressFields = ScopeFields &
  Pick<Project, "bookProgress" | "storyProgress" | "otherProgress">;

export interface VisibleSections {
  books: boolean;
  stories: boolean;
  other: boolean;
}

export function visibleSections(project: ProgressFields): VisibleSections {
  return {
    books: showsBookTable(project) || project.bookProgress.length > 0,
    stories: showsStoryTable(project) || project.storyProgress.length > 0,
    other:
      showsOtherTable(project) || (project.otherProgress ?? []).length > 0,
  };
}

export function addBookRow(
  rows: readonly BookProgressItem[],
  book: BibleBook,
): BookProgressItem[] {
  if (rows.some((row) => row.id === book.id)) return [...rows];
  return [
    ...rows,
    {
      id: book.id,
      name: book.name,
      chapters: book.chapters,
      translated: 0,
      communityChecked: 0,
      mentorApproved: 0,
    },
  ];
}

export function emptyStoryRow(): StoryProgressItem {
  return {
    name: "",
    audioHours: "",
    recordLocation: "",
    recordStatus: "planned",
    aiAssisted: false,
  };
}

export function emptyOtherRow(): OtherProgressItem {
  return {
    name: "",
    chapters: 1,
    translated: 0,
    communityChecked: 0,
    mentorApproved: 0,
  };
}

export function patchRow<T>(
  rows: readonly T[],
  index: number,
  patch: Partial<T>,
): T[] {
  return rows.map((row, i) => (i === index ? { ...row, ...patch } : row));
}

export function removeRow<T>(rows: readonly T[], index: number): T[] {
  return rows.filter((_, i) => i !== index);
}

export function clampCount(raw: string, max?: number): number {
  const value = Math.max(0, Math.floor(Number(raw) || 0));
  return max === undefined ? value : Math.min(max, value);
}

export function clampChapters(raw: string): number {
  return Math.max(1, Math.floor(Number(raw) || 1));
}

export interface BreakdownRow {
  name: string;
  chapters: number;
  translated: number;
  community: number;
  approved: number;
}

export function toBreakdownRow(
  item: BookProgressItem | StoryProgressItem | OtherProgressItem,
): BreakdownRow {
  return {
    name: item.name,
    chapters: ("chapters" in item ? item.chapters : 0) || 1,
    translated: "translated" in item ? item.translated || 0 : 0,
    community: "communityChecked" in item ? item.communityChecked || 0 : 0,
    approved: "mentorApproved" in item ? item.mentorApproved || 0 : 0,
  };
}

export const STATUS_BANNER_LABEL_KEYS: Record<ProjectStatus, string> = {
  "nao-iniciado": "project_status_active",
  "em-andamento": "project_status_active",
  final: "project_status_active",
  pausado: "project_status_paused",
  planejado: "project_status_planned",
  cancelado: "status_canceled",
  concluido: "status_completed",
  desconhecido: "status_unknown",
};

export const STATUS_BANNER_DOTS: Record<ProjectStatus, string> = {
  "nao-iniciado": "bg-verde-claro ring-4 ring-verde-claro/18",
  "em-andamento": "bg-verde-claro ring-4 ring-verde-claro/18",
  final: "bg-verde-claro ring-4 ring-verde-claro/18",
  pausado: "bg-status-attention ring-4 ring-status-attention/18",
  planejado: "bg-azul ring-4 ring-azul/25",
  cancelado: "bg-areia ring-4 ring-areia/25",
  concluido: "bg-verde-claro ring-4 ring-verde-claro/22",
  desconhecido: "bg-fg-subtle",
};

export interface StatusOption {
  value: ProjectStatus;
  labelKey: string;
  card: string;
  activeCard: string;
}

export const STATUS_OPTIONS: readonly StatusOption[] = [
  {
    value: "em-andamento",
    labelKey: "project_status_active",
    card: "hover:border-verde-claro",
    activeCard: "border-verde-claro bg-verde-claro/12",
  },
  {
    value: "pausado",
    labelKey: "project_status_paused",
    card: "hover:border-status-attention",
    activeCard: "border-status-attention bg-status-attention/12",
  },
  {
    value: "planejado",
    labelKey: "project_status_planned",
    card: "hover:border-azul",
    activeCard: "border-azul bg-azul/12",
  },
];

export const COUNT_LABEL_KEYS: Record<ProgressCountKey, string> = {
  translated: "d_p_translated",
  community: "d_p_community",
  approved: "d_p_approved",
};
