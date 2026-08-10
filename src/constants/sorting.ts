export const SORT_KEYS = [
  "deadline",
  "name",
  "progress",
  "team",
  "health",
] as const;

export type SortKey = (typeof SORT_KEYS)[number];

export const DEFAULT_SORT: SortKey = "deadline";

export const SORT_LABEL_KEYS: Record<SortKey, string> = {
  deadline: "sort_deadline",
  name: "sort_name",
  progress: "sort_progress",
  team: "sort_team",
  health: "sort_health",
};

export const isSortKey = (value: string): value is SortKey =>
  SORT_KEYS.some((key) => key === value);
