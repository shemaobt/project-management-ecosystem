import type { TFunction } from "i18next";
import { NEED_CATEGORIES, OPEN_NEED_STATUSES } from "../constants/project";
import type {
  NeedCategory,
  NeedItem,
  NeedStatus,
  NeedUrgency,
  Project,
} from "../types/project";
import type { RegionKey } from "../types/region";
import { atLocalMidnight, MS_PER_DAY } from "./recency";
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

/**
 * How long a need may sit unseen before it is surfaced as unacknowledged.
 *
 * Owned by the server's sweep, not by the frontend's `recent` preset — BE-08's
 * `list_unacknowledged_needs` sweeps for thirty days, and this mirrors that number so
 * the two readings agree. It happens to equal `RECENT_UPDATE_DAYS` today, but the two
 * are answering different questions (has anybody seen this need vs. did anything
 * change on the project lately) and must not be aliased, or moving one silently moves
 * the other.
 */
export const UNACKNOWLEDGED_AFTER_DAYS = 30;

/** The day a need is aged from — `submittedAt`, or `undefined` for one the console has
 * not saved yet (an unsaved draft has no age to report). */
export function raisedOn(need: NeedItem): string | undefined {
  return need.submittedAt || undefined;
}

/** Days since `need` was raised, as of `now` — `null` for a need with no date to age
 * from, the same shape `getDaysSinceUpdate` (`src/utils/recency.ts`) uses. */
export function daysSinceRaised(need: NeedItem, now: Date = new Date()): number | null {
  const date = raisedOn(need);
  if (!date) return null;
  return Math.floor((now.getTime() - atLocalMidnight(date).getTime()) / MS_PER_DAY);
}

/**
 * Whether nobody has so much as looked at this need in over a month.
 *
 * The product's own second question, after "what is happening": *has anybody seen it*.
 * A need already moved out of `open` was seen by whoever moved it (BE-08's own rule,
 * stated on the payload so the two axes cannot disagree) — `isOpenNeed` is checked
 * first so a fulfilled or dropped need is never read as unacknowledged.
 */
export function isUnacknowledged(need: NeedItem, now: Date = new Date()): boolean {
  if (!isOpenNeed(need)) return false;
  if (need.acknowledgedAt) return false;
  const days = daysSinceRaised(need, now);
  return days !== null && days >= UNACKNOWLEDGED_AFTER_DAYS;
}

export function unacknowledgedNeeds(
  needs: readonly NeedItem[],
  now: Date = new Date(),
): NeedItem[] {
  return needs.filter((need) => isUnacknowledged(need, now));
}

/**
 * Which half of the money pair is missing, or `null` when the two agree — both present
 * or both absent. The database refuses the mismatched pair with a `CHECK`; this is the
 * half that can say which field to fill before the round trip.
 */
export function needMoneyError(need: NeedItem): "amount" | "currency" | null {
  const hasAmount = Boolean(need.estimatedAmount);
  const hasCurrency = Boolean(need.estimatedCurrency);
  if (hasAmount === hasCurrency) return null;
  return hasAmount ? "currency" : "amount";
}

const text = (value: string | undefined): string => value ?? "";

const sameAmount = (left: string | undefined, right: string | undefined): boolean =>
  !left || !right ? !left && !right : Number(left) === Number(right);

const currency = (value: string | undefined): string => text(value).trim().toUpperCase();

/**
 * Whether `filed` is the need the server made of `typed` — a create's own echo, read back
 * (OBT-625). What the server adds of its own is not a difference: the row's `id`, the day it
 * stamps on a need sent without one, the acknowledgement it stamps for the gesture or for a
 * status that is not `open`, the two decimals `Numeric(14, 2)` hands back and the upper-cased
 * currency. A reader who is handed the free text empty (a withheld record read as `other`)
 * cannot tell two descriptions apart, so `readsText` leaves them out.
 */
export function isFiledNeed(
  typed: NeedItem,
  filed: NeedItem,
  readsText: boolean,
): boolean {
  if (typed.category !== filed.category) return false;
  if (typed.urgency !== filed.urgency || typed.status !== filed.status) return false;
  if (readsText && typed.description !== filed.description) return false;
  if (typed.submittedAt && typed.submittedAt !== filed.submittedAt) return false;
  if (typed.acknowledged && !filed.acknowledgedAt) return false;
  if (!sameAmount(typed.estimatedAmount, filed.estimatedAmount)) return false;
  if (currency(typed.estimatedCurrency) !== currency(filed.estimatedCurrency)) return false;
  if (Boolean(typed.prayerShared) !== Boolean(filed.prayerShared)) return false;
  if (Boolean(typed.prayerAnswered) !== Boolean(filed.prayerAnswered)) return false;
  return (
    [
      "estimatedValue",
      "deadline",
      "fulfilledBy",
      "fulfilledDate",
      "droppedDate",
      "submittedBy",
    ] as const
  ).every((field) => text(typed[field]) === text(filed[field]));
}

/**
 * The needs a draft still has to carry onto the record its own lost create filed — or `null`
 * when every one of them is already there (OBT-625).
 *
 * The server creates every row sent without an id and never deletes one (`plan_needs`), so a
 * need it already filed must never travel again as new: each typed need is matched one to one
 * with its echo. What is left was typed after the send. A leftover with **exactly one**
 * leftover saved need of its category is that need, edited — it goes back under the saved
 * one's id and is updated in place; anything else goes as a new row, beside the saved list,
 * because pairing among several would hand one need's history to another. The order the
 * server answers in cannot pair them: needs filed together share their day and creation
 * instant, and the rest is the id.
 */
export function reconcileFiledNeeds(
  typed: readonly NeedItem[],
  filed: readonly NeedItem[],
  readsText: boolean,
): NeedItem[] | null {
  const unheld = [...filed];
  const left: NeedItem[] = [];
  for (const need of typed) {
    const at = unheld.findIndex((saved) => isFiledNeed(need, saved, readsText));
    if (at >= 0) unheld.splice(at, 1);
    else left.push(need);
  }
  if (left.length === 0) return null;

  const edited = new Map<NeedItem, NeedItem>();
  const added: NeedItem[] = [];
  for (const need of left) {
    const typedAlike = left.filter((other) => other.category === need.category);
    const savedAlike = unheld.filter((saved) => saved.category === need.category);
    if (typedAlike.length === 1 && savedAlike.length === 1) {
      const [saved] = savedAlike;
      edited.set(saved, {
        ...saved,
        ...need,
        id: saved.id,
        description: readsText ? need.description : saved.description,
      });
    } else {
      added.push(need);
    }
  }
  return [...filed.map((saved) => edited.get(saved) ?? saved), ...added];
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

/** A need category in the reader's language — the server's own word when the catalogue has none. */
export function needCategoryLabel(category: string, t: TFunction): string {
  const found = NEED_CATEGORIES.find((candidate) => candidate.id === category);
  return found ? t(found.labelKey) : category;
}
