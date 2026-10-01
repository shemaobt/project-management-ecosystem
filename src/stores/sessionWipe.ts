import { onSessionEvent } from "../services/api";
import { accessToken, type SessionEvent } from "../services/api/tokens";
import { useAssessmentStore } from "./assessmentStore";
import { useFiltersStore } from "./filtersStore";
import { useFormsStore } from "./formsStore";
import { usePrayerStore } from "./prayerStore";
import { useProjectsStore } from "./projectsStore";
import { useRecordStore } from "./recordStore";
import { useRegionsStore } from "./regionsStore";
import { useRhythmStore } from "./rhythmStore";

interface WipeableStore<State> {
  getInitialState: () => State;
  setState: (state: State, replace: true) => unknown;
  persist: { clearStorage: () => void };
}

type Wipe = () => void;

function wipeOf<State>(store: WipeableStore<State>): Wipe {
  return () => {
    store.persist.clearStorage();
    store.setState(store.getInitialState(), true);
  };
}

/**
 * What a reader's session leaves in this browser, read off the server for them: other
 * people's submissions, the org chart, the intercessor network, the project list. A shared or
 * borrowed device is the normal case in the field, so none of it outlives the session.
 */
const READ_FOR_THE_READER: readonly Wipe[] = [
  wipeOf(useProjectsStore),
  wipeOf(useFormsStore),
  wipeOf(useRegionsStore),
  wipeOf(usePrayerStore),
];

/**
 * What the person typed and has not sent — a health reading's notes and prayer request, a
 * record's unsaved edits, a meeting's draft, the filters they searched with. Wiped on a sign-out
 * the person chose, and kept on an expiry, which nobody chose and which most often ends with the
 * same person signing back in to finish.
 */
const TYPED_BY_THE_READER: readonly Wipe[] = [
  wipeOf(useAssessmentStore),
  wipeOf(useRecordStore),
  wipeOf(useRhythmStore),
  wipeOf(useFiltersStore),
];

/**
 * Who the drafts in this browser belong to — the account id the access token names (`sub`).
 * An expiry keeps the drafts for the person who most often signs back in to finish; this is what
 * tells, at the next sign-in, whether that is who signed in (PR #83 review). Only the opaque id
 * is kept, never a name.
 */
const LAST_READER_KEY = "shema-last-reader-v1";

export function readerOf(token: string | null): string | null {
  const payload = token?.split(".")[1];
  if (!payload) return null;
  try {
    const json = atob(payload.replace(/-/gu, "+").replace(/_/gu, "/"));
    const sub = (JSON.parse(json) as { sub?: unknown }).sub;
    return typeof sub === "string" && sub !== "" ? sub : null;
  } catch {
    return null;
  }
}

function lastReader(): string | null {
  try {
    return localStorage.getItem(LAST_READER_KEY);
  } catch {
    return null;
  }
}

function rememberReader(reader: string | null): void {
  try {
    if (reader === null) localStorage.removeItem(LAST_READER_KEY);
    else localStorage.setItem(LAST_READER_KEY, reader);
  } catch {
    // A browser that refuses storage keeps no drafts to hand over either.
  }
}

/** Whether the account signing in is the one whose data this browser holds. */
export type ReaderMatch = "same" | "other" | "unknown";

export function matchReader(last: string | null, reader: string | null): ReaderMatch {
  if (last === null || reader === null) return "unknown";
  return last === reader ? "same" : "other";
}

/**
 * The stores a session event empties (INT-12 · OBT-417). On a sign-in it depends on who:
 * closing the tab fires no event at all, which is the ordinary way a phone changes hands, and
 * the read stores persist `hydrated` beside their data, so a sign-in is the only moment left to
 * clear them (PR #83 review). Another account gets nothing of the last one; an account the
 * browser cannot place gets no read data — it is read again — while drafts, which cannot be read
 * again, wait for a reader the browser can tell apart.
 */
export function storesWipedOn(event: SessionEvent, match: ReaderMatch = "same"): readonly Wipe[] {
  if (event === "signedOut") return [...READ_FOR_THE_READER, ...TYPED_BY_THE_READER];
  if (event === "expired") return READ_FOR_THE_READER;
  if (match === "other") return [...READ_FOR_THE_READER, ...TYPED_BY_THE_READER];
  if (match === "unknown") return READ_FOR_THE_READER;
  return [];
}

onSessionEvent((event) => {
  let match: ReaderMatch = "same";
  if (event === "signedIn") {
    const reader = readerOf(accessToken());
    match = matchReader(lastReader(), reader);
    rememberReader(reader);
  }
  if (event === "signedOut") rememberReader(null);
  for (const wipe of storesWipedOn(event, match)) wipe();
});
