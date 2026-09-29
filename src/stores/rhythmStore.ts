import { create } from "zustand";
import { persist } from "zustand/middleware";
import { announceFailure, meetingsAPI, toApiFailure } from "../services/api";
import { MEETING_IDS } from "../constants/meetings";
import type { MeetingId, MeetingLogEntry } from "../types/meeting";
import type { RegionKey } from "../types/region";
import type { ApiFailure } from "../types/session";
import type { MeetingScopeKey } from "../utils/rhythm";
import { createDeferredJsonStorage } from "./draftStorage";
import {
  createHydrationSlot,
  hydrateOnce,
  NOT_HYDRATED,
  type HydrationStatus,
} from "./hydration";

/**
 * The log's own key until INT-07 (OBT-412). It held the whole log — the notes of every meeting,
 * a pastoral reading of a team — in this browser, which is exactly the copy the server replaces.
 * It is removed on load, and only the typed notes under it survive, moved to {@link DRAFTS_KEY}.
 */
export const LEGACY_RHYTHM_KEY = "shema-rhythm-v1";

export const DRAFTS_KEY = "shema-rhythm-drafts-v1";

const RHYTHM_DRAFTS_VERSION = 1;

export interface MeetingNote {
  date: string;
  notes: string;
}

export function draftKey(
  meetingId: MeetingId,
  scopeKey: MeetingScopeKey,
): string {
  return `${meetingId}__${scopeKey}`;
}

export type RhythmWrite =
  | { status: "saved" }
  | { status: "failed"; failure: ApiFailure };

/**
 * The log belongs to `shema-api` (BE-10) and the store keeps no copy of it across a reload:
 * `reload` reads it on every visit, because it is written by other coordinators and scoped by
 * who is signed in. The **drafts** are the one thing kept in this browser — a typed note is not
 * a write (FE-44 §10), and closing the dialog must not cost it (FE-31).
 *
 * `forbidden` is a reading, not an error: the server refuses the log to every role outside the
 * health audience (the Resource Circle today), so for that session the screen says whose the
 * log is instead of announcing a failure on every visit.
 */
interface RhythmState extends HydrationStatus {
  log: MeetingLogEntry[];
  forbidden: boolean;
  drafts: Record<string, MeetingNote>;
  reload: () => Promise<void>;
  setDraft: (key: string, draft: MeetingNote) => void;
  clearDraft: (key: string) => void;
  logMeeting: (
    meetingId: MeetingId,
    scopeKey: RegionKey,
    entry: MeetingNote,
  ) => Promise<RhythmWrite>;
  undoMeeting: (
    meetingId: MeetingId,
    scopeKey: RegionKey,
    period: string,
  ) => Promise<RhythmWrite>;
}

type PersistedDrafts = Pick<RhythmState, "drafts">;

function isKnownMeeting(id: unknown): id is MeetingId {
  return typeof id === "string" && MEETING_IDS.has(id as MeetingId);
}

function sameSlot(
  entry: MeetingLogEntry,
  meetingId: MeetingId,
  scopeKey: MeetingScopeKey,
  period: string,
): boolean {
  return (
    entry.meetingId === meetingId &&
    entry.scopeKey === scopeKey &&
    entry.period === period
  );
}

function isMeetingNote(value: unknown): value is MeetingNote {
  if (typeof value !== "object" || value === null) return false;
  const { date, notes } = value as Record<string, unknown>;
  return typeof date === "string" && typeof notes === "string";
}

function parseJson(raw: string | null): unknown {
  if (raw === null) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function draftsOf(persisted: unknown): Record<string, unknown> {
  if (typeof persisted !== "object" || persisted === null) return {};
  const state = (persisted as { state?: unknown }).state;
  if (typeof state !== "object" || state === null) return {};
  const drafts = (state as { drafts?: unknown }).drafts;
  return typeof drafts === "object" && drafts !== null
    ? (drafts as Record<string, unknown>)
    : {};
}

/**
 * The typed notes of the legacy key that still name one of GATE-02's three meetings. A note
 * under an id that no longer exists is **dropped, not remapped** (FE-49): `obtlab_team` was
 * quarterly and the bimonthly is not its successor.
 */
export function legacyDrafts(persisted: unknown): Record<string, MeetingNote> {
  const kept: Record<string, MeetingNote> = {};
  for (const [key, draft] of Object.entries(draftsOf(persisted))) {
    if (isKnownMeeting(key.split("__")[0]) && isMeetingNote(draft)) {
      kept[key] = draft;
    }
  }
  return kept;
}

/**
 * Removes the legacy key and hands its surviving notes to the drafts key, before the store
 * reads it. A note already under the drafts key wins over its legacy copy, and an unreadable
 * legacy file carries nothing but is removed all the same.
 */
export function retireLegacyRhythm(
  storage: Pick<Storage, "getItem" | "setItem" | "removeItem">,
): void {
  const raw = storage.getItem(LEGACY_RHYTHM_KEY);
  if (raw === null) return;
  const carried = legacyDrafts(parseJson(raw));
  if (Object.keys(carried).length > 0) {
    const held = legacyDrafts(parseJson(storage.getItem(DRAFTS_KEY)));
    storage.setItem(
      DRAFTS_KEY,
      JSON.stringify({
        state: { drafts: { ...carried, ...held } },
        version: RHYTHM_DRAFTS_VERSION,
      }),
    );
  }
  storage.removeItem(LEGACY_RHYTHM_KEY);
}

function retireOnLoad(): void {
  if (typeof localStorage === "undefined") return;
  try {
    retireLegacyRhythm(localStorage);
  } catch {
    return;
  }
}

retireOnLoad();

const draftStorage = createDeferredJsonStorage<PersistedDrafts>();

export const useRhythmStore = create<RhythmState>()(
  persist<RhythmState, [], [], PersistedDrafts>(
    (set, get) => {
      const slot = createHydrationSlot();
      const load = async () => {
        try {
          set({ log: await meetingsAPI.log(), forbidden: false });
        } catch (error) {
          if (toApiFailure(error).kind !== "forbidden") throw error;
          set({ log: [], forbidden: true });
        }
      };

      const failed = (error: unknown): RhythmWrite => {
        const failure = toApiFailure(error);
        announceFailure(failure);
        return { status: "failed", failure };
      };

      return {
        log: [],
        forbidden: false,
        drafts: {},
        ...NOT_HYDRATED,
        reload: () => hydrateOnce(slot, get, set, load, true),
        setDraft: (key, draft) =>
          set((state) => ({ drafts: { ...state.drafts, [key]: draft } })),
        clearDraft: (key) =>
          set((state) => {
            if (!(key in state.drafts)) return state;
            const drafts = { ...state.drafts };
            delete drafts[key];
            return { drafts };
          }),
        logMeeting: async (meetingId, scopeKey, entry) => {
          let logged: MeetingLogEntry;
          try {
            logged = await meetingsAPI.logMeeting({
              meetingId,
              scopeKey,
              date: entry.date,
              notes: entry.notes,
            });
          } catch (error) {
            return failed(error);
          }
          set((state) => {
            const drafts = { ...state.drafts };
            delete drafts[draftKey(meetingId, scopeKey)];
            return {
              drafts,
              log: [
                ...state.log.filter(
                  (item) =>
                    !sameSlot(item, logged.meetingId, logged.scopeKey, logged.period),
                ),
                logged,
              ],
            };
          });
          return { status: "saved" };
        },
        undoMeeting: async (meetingId, scopeKey, period) => {
          try {
            await meetingsAPI.undo(meetingId, scopeKey, period);
          } catch (error) {
            if (toApiFailure(error).kind !== "notFound") return failed(error);
          }
          set((state) => ({
            log: state.log.filter(
              (entry) => !sameSlot(entry, meetingId, scopeKey, period),
            ),
          }));
          return { status: "saved" };
        },
      };
    },
    {
      name: DRAFTS_KEY,
      version: RHYTHM_DRAFTS_VERSION,
      storage: draftStorage,
      partialize: (state) => ({ drafts: state.drafts }),
    },
  ),
);
