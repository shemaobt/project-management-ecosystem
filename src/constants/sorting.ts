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

/**
 * The orders a reader may ask for. The health order is the health audience's (OBT-553):
 * outside it the server falls back to the default, so offering it would name an order the
 * list does not follow.
 */
export const sortKeysFor = (readsHealth: boolean): readonly SortKey[] =>
  readsHealth ? SORT_KEYS : SORT_KEYS.filter((key) => key !== "health");
