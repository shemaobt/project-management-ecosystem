import { toApiFailure } from "../../../services/api/errors";
import type { AccountGrants } from "../../../types/access";
import type { RegionKey } from "../../../types/region";
import type { ApiFailure } from "../../../types/session";
import type { RegionEditing, RoleRefusal } from "./PersonPanel";

export type Lookup =
  | { kind: "idle" }
  | { kind: "searching"; email: string }
  | { kind: "found"; account: AccountGrants }
  | { kind: "none"; email: string }
  | { kind: "failed"; email: string; failure: ApiFailure };

export interface Write {
  ticket: number;
  target: AccountGrants;
  row: string;
}

export interface PersonState {
  asked: number;
  lookup: Lookup;
  writes: readonly Write[];
  settledWhileSearching: readonly AccountGrants[];
  refusal: RoleRefusal | null;
  editing: RegionEditing | null;
  left: boolean;
}

export type PersonEvent =
  | { type: "search"; ticket: number; email: string }
  | { type: "answered"; ticket: number; lookup: Lookup }
  | { type: "write"; ticket: number; target: AccountGrants; row: string }
  | { type: "written"; ticket: number; account: AccountGrants; keepsEditing?: boolean }
  | { type: "refused"; ticket: number; failure: ApiFailure }
  | { type: "openRegions"; editing: RegionEditing; clearsRefusal: boolean }
  | { type: "pickRegions"; regions: RegionKey[] }
  | { type: "closeRegions" }
  | { type: "entered" }
  | { type: "left" };

export interface AwayNotice {
  target: AccountGrants;
  failure: ApiFailure | null;
}

export interface PersonCard {
  account: AccountGrants;
  acting: string | null;
  refusal: RoleRefusal | null;
  editing: RegionEditing | null;
}

export const NOBODY_SEARCHED: PersonState = {
  asked: 0,
  lookup: { kind: "idle" },
  writes: [],
  settledWhileSearching: [],
  refusal: null,
  editing: null,
  left: false,
};

function onScreen(state: PersonState, userId: string): boolean {
  return (
    !state.left &&
    state.lookup.kind === "found" &&
    state.lookup.account.userId === userId
  );
}

function writeOf(state: PersonState, ticket: number): Write | undefined {
  return state.writes.find((write) => write.ticket === ticket);
}

function withoutWrite(state: PersonState, ticket: number): readonly Write[] {
  return state.writes.filter((write) => write.ticket !== ticket);
}

export function personReducer(state: PersonState, event: PersonEvent): PersonState {
  switch (event.type) {
    case "search":
      return {
        ...state,
        asked: event.ticket,
        lookup: { kind: "searching", email: event.email },
        settledWhileSearching: [],
        refusal: null,
        editing: null,
      };
    case "answered": {
      if (event.ticket !== state.asked) return state;
      const answered = event.lookup;
      const settled =
        answered.kind === "found"
          ? state.settledWhileSearching.find(
              (account) => account.userId === answered.account.userId,
            )
          : undefined;
      return {
        ...state,
        lookup: settled ? { kind: "found", account: settled } : answered,
        settledWhileSearching: [],
      };
    }
    case "write":
      return {
        ...state,
        writes: [...state.writes, { ticket: event.ticket, target: event.target, row: event.row }],
        refusal: null,
      };
    case "written": {
      const write = writeOf(state, event.ticket);
      if (!write) return state;
      const writes = withoutWrite(state, event.ticket);
      if (onScreen(state, write.target.userId)) {
        return {
          ...state,
          writes,
          lookup: { kind: "found", account: event.account },
          editing: event.keepsEditing ? state.editing : null,
        };
      }
      if (!state.left && state.lookup.kind === "searching") {
        return {
          ...state,
          writes,
          settledWhileSearching: [
            ...state.settledWhileSearching.filter(
              (account) => account.userId !== event.account.userId,
            ),
            event.account,
          ],
        };
      }
      return { ...state, writes };
    }
    case "refused": {
      const write = writeOf(state, event.ticket);
      if (!write) return state;
      const writes = withoutWrite(state, event.ticket);
      return onScreen(state, write.target.userId)
        ? { ...state, writes, refusal: { row: write.row, failure: event.failure } }
        : { ...state, writes };
    }
    case "openRegions":
      return {
        ...state,
        editing: event.editing,
        refusal: event.clearsRefusal ? null : state.refusal,
      };
    case "pickRegions":
      return state.editing
        ? { ...state, editing: { ...state.editing, regions: event.regions } }
        : state;
    case "closeRegions":
      return { ...state, editing: null };
    case "entered":
      return state.left ? { ...state, left: false } : state;
    case "left":
      return { ...state, left: true };
  }
}

export function awayNotice(state: PersonState, event: PersonEvent): AwayNotice | null {
  if (event.type !== "written" && event.type !== "refused") return null;
  const write = writeOf(state, event.ticket);
  if (!write || onScreen(state, write.target.userId)) return null;
  return {
    target: write.target,
    failure: event.type === "refused" ? event.failure : null,
  };
}

export function writingRow(state: PersonState, userId: string): string | null {
  return state.writes.find((write) => write.target.userId === userId)?.row ?? null;
}

export function cardOf(state: PersonState): PersonCard | null {
  if (state.lookup.kind !== "found") return null;
  const { account } = state.lookup;
  return {
    account,
    acting: writingRow(state, account.userId),
    refusal: state.refusal,
    editing: state.editing,
  };
}

export interface PersonStore {
  get: () => PersonState;
  subscribe: (listener: () => void) => () => void;
  dispatch: (event: PersonEvent) => AwayNotice | null;
  ticket: () => number;
}

/**
 * The state lives outside React so the handler of a request learns, as it lands, whether its
 * answer reached the card — and says it otherwise, even after the page was left.
 */
export function createPersonStore(initial: PersonState = NOBODY_SEARCHED): PersonStore {
  let state = initial;
  let tickets = 0;
  const listeners = new Set<() => void>();
  return {
    get: () => state,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    dispatch: (event) => {
      const notice = awayNotice(state, event);
      const next = personReducer(state, event);
      if (next !== state) {
        state = next;
        listeners.forEach((listener) => listener());
      }
      return notice;
    },
    ticket: () => (tickets += 1),
  };
}

export interface MembershipOutcome {
  changed: boolean;
  away: AwayNotice | null;
}

/**
 * A write of the card, so it answers under the four rules a grant does and nothing crosses it
 * (OBT-679). It touches no region, so the picker stays open; and once the membership is written a
 * failed re-read never tells a card the Admin left that the change was not saved.
 */
export async function settleMembership(
  store: PersonStore,
  reread: (email: string) => Promise<AccountGrants>,
  target: AccountGrants,
  row: string,
  change: () => Promise<unknown>,
): Promise<MembershipOutcome> {
  const ticket = store.ticket();
  store.dispatch({ type: "write", ticket, target, row });
  try {
    await change();
  } catch (raw: unknown) {
    const away = store.dispatch({ type: "refused", ticket, failure: toApiFailure(raw) });
    return { changed: false, away };
  }
  try {
    const account = await reread(target.email);
    const away = store.dispatch({ type: "written", ticket, account, keepsEditing: true });
    return { changed: true, away };
  } catch (raw: unknown) {
    const away = store.dispatch({ type: "refused", ticket, failure: toApiFailure(raw) });
    return { changed: true, away: away && { ...away, failure: null } };
  }
}
