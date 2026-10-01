import { onSessionEvent } from "../services/api";
import type { SessionEvent } from "../services/api/tokens";
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

/** The stores a session event empties (INT-12 · OBT-417). */
export function storesWipedOn(event: SessionEvent): readonly Wipe[] {
  if (event === "signedOut") return [...READ_FOR_THE_READER, ...TYPED_BY_THE_READER];
  if (event === "expired") return READ_FOR_THE_READER;
  return [];
}

onSessionEvent((event) => {
  for (const wipe of storesWipedOn(event)) wipe();
});
