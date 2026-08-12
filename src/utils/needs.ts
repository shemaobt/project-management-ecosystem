import { OPEN_NEED_STATUSES } from "../constants/project";
import type {
  NeedCategory,
  NeedItem,
  NeedStatus,
  NeedUrgency,
  Project,
} from "../types/project";
import type { RegionKey } from "../types/region";
import { getRegion } from "./region";

export function isOpenNeed(need: NeedItem): boolean {
  return OPEN_NEED_STATUSES.includes(need.status);
}

export function openNeeds(needs: readonly NeedItem[]): NeedItem[] {
  return needs.filter(isOpenNeed);
}

export function closedNeeds(needs: readonly NeedItem[]): NeedItem[] {
  return needs.filter((need) => !isOpenNeed(need));
}

export function hasOpenNeeds(needs: readonly NeedItem[]): boolean {
  return needs.some(isOpenNeed);
}

export function hasUrgentOpenNeed(needs: readonly NeedItem[]): boolean {
  return needs.some((need) => need.urgency === "high" && isOpenNeed(need));
}

export function makeNeed(): NeedItem {
  return {
    category: "financial",
    urgency: "low",
    status: "open",
    description: "",
  };
}

export function addNeed(
  needs: readonly NeedItem[],
  need: NeedItem = makeNeed(),
): NeedItem[] {
  return [...needs, need];
}

export function removeNeedAt(
  needs: readonly NeedItem[],
  index: number,
): NeedItem[] {
  return needs.filter((_, position) => position !== index);
}

export function setNeedAt(
  needs: readonly NeedItem[],
  index: number,
  patch: Partial<NeedItem>,
): NeedItem[] {
  return needs.map((need, position) =>
    position === index ? { ...need, ...patch } : need,
  );
}

export function setNeedStatus(
  needs: readonly NeedItem[],
  index: number,
  status: NeedStatus,
): NeedItem[] {
  return needs.map((need, position) => {
    if (position !== index) return need;

    const next: NeedItem = { ...need, status };
    if (status !== "fulfilled") {
      delete next.fulfilledBy;
      delete next.fulfilledDate;
    }
    if (status !== "dropped") {
      delete next.droppedDate;
    }
    return next;
  });
}

export function closedOn(need: NeedItem): string | undefined {
  if (need.status === "fulfilled") return need.fulfilledDate;
  if (need.status === "dropped") return need.droppedDate;
  return undefined;
}

export interface NeedsQuery {
  region?: RegionKey;
  from?: string;
  to?: string;
}

export interface NeedsRollup {
  total: number;
  open: number;
  projects: number;
  byCategory: Partial<Record<NeedCategory, number>>;
  byUrgency: Record<NeedUrgency, number>;
  byStatus: Record<NeedStatus, number>;
  byRegion: Partial<Record<RegionKey, number>>;
}

function withinPeriod(need: NeedItem, query: NeedsQuery): boolean {
  const raised = need.submittedAt;
  if (!query.from && !query.to) return true;
  if (!raised) return false;
  if (query.from && raised < query.from) return false;
  if (query.to && raised > query.to) return false;
  return true;
}

export function aggregateNeeds(
  projects: readonly Project[],
  query: NeedsQuery = {},
): NeedsRollup {
  const rollup: NeedsRollup = {
    total: 0,
    open: 0,
    projects: 0,
    byCategory: {},
    byUrgency: { low: 0, medium: 0, high: 0 },
    byStatus: { open: 0, "in-progress": 0, fulfilled: 0, dropped: 0 },
    byRegion: {},
  };

  for (const project of projects) {
    const region = getRegion(project);
    if (query.region && region !== query.region) continue;

    const needs = project.needsItems.filter((need) =>
      withinPeriod(need, query),
    );
    if (needs.length === 0) continue;

    rollup.projects += 1;
    for (const need of needs) {
      rollup.total += 1;
      if (isOpenNeed(need)) rollup.open += 1;
      rollup.byCategory[need.category] =
        (rollup.byCategory[need.category] ?? 0) + 1;
      rollup.byUrgency[need.urgency] += 1;
      rollup.byStatus[need.status] += 1;
      rollup.byRegion[region] = (rollup.byRegion[region] ?? 0) + 1;
    }
  }

  return rollup;
}
