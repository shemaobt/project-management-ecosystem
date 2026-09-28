import { create } from "zustand";
import { persist } from "zustand/middleware";
import { meetingsAPI } from "../services/api";
import { MEETING_IDS } from "../constants/meetings";
import type { MeetingCadence, MeetingId, MeetingLogEntry } from "../types/meeting";
import { parseIsoDate, periodKey } from "../utils/cadence";
import type { MeetingScopeKey } from "../utils/rhythm";
import { createDeferredJsonStorage } from "./draftStorage";
import {
  createHydrationSlot,
  hydrateOnce,
  NOT_HYDRATED,
  type HydrationStatus,
} from "./hydration";

const RHYTHM_KEY = "shema-rhythm-v1";

export const RHYTHM_VERSION = 2;

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

interface RhythmState extends HydrationStatus {
  log: MeetingLogEntry[];
  drafts: Record<string, MeetingNote>;
  hydrate: () => Promise<void>;
  setDraft: (key: string, draft: MeetingNote) => void;
  clearDraft: (key: string) => void;
  logMeeting: (
    meetingId: MeetingId,
    scopeKey: MeetingScopeKey,
    cadence: MeetingCadence,
    entry: MeetingNote,
  ) => void;
  undoMeeting: (
    meetingId: MeetingId,
    scopeKey: MeetingScopeKey,
    period: string,
  ) => void;
}

type PersistedRhythm = Pick<RhythmState, "log" | "drafts" | "hydrated">;

function isKnownMeeting(id: unknown): id is MeetingId {
  return typeof id === "string" && MEETING_IDS.has(id as MeetingId);
}

/**
 * Version 2 is GATE-02's set (FE-49, OBT-529). A log or a typed note under an id that no
 * longer exists is **dropped, not remapped**: the five wave-1 meetings are not the three that
 * replaced them — `obtlab_team` was quarterly and the bimonthly is not its successor — so
 * moving an entry across would put a meeting that happened into a period it never belonged to.
 * What survives is whatever already names one of the three, and nothing else is touched.
 */
export function migrateRhythm(persisted: unknown): PersistedRhythm {
  const state = (persisted ?? {}) as Partial<PersistedRhythm>;
  const log = Array.isArray(state.log)
    ? state.log.filter((entry) => isKnownMeeting(entry?.meetingId))
    : [];
  const drafts: Record<string, MeetingNote> = {};
  for (const [key, draft] of Object.entries(state.drafts ?? {})) {
    if (isKnownMeeting(key.split("__")[0])) drafts[key] = draft;
  }
  return { log, drafts, hydrated: false };
}

const rhythmStorage = createDeferredJsonStorage<PersistedRhythm>();

export const useRhythmStore = create<RhythmState>()(
  persist<RhythmState, [], [], PersistedRhythm>(
    (set, get) => {
      const slot = createHydrationSlot();

      return {
        log: [],
        drafts: {},
        ...NOT_HYDRATED,
        hydrate: () =>
          hydrateOnce(slot, get, set, async () => {
            set({ log: await meetingsAPI.log() });
          }),
        setDraft: (key, draft) =>
          set((state) => ({ drafts: { ...state.drafts, [key]: draft } })),
        clearDraft: (key) =>
          set((state) => {
            if (!(key in state.drafts)) return state;
            const drafts = { ...state.drafts };
            delete drafts[key];
            return { drafts };
          }),
        logMeeting: (meetingId, scopeKey, cadence, entry) => {
          const held = parseIsoDate(entry.date);
          if (!held) return;
          const period = periodKey(cadence, held);
          set((state) => {
            const drafts = { ...state.drafts };
            delete drafts[draftKey(meetingId, scopeKey)];
            const kept = state.log.filter(
              (item) =>
                item.meetingId !== meetingId ||
                item.scopeKey !== scopeKey ||
                item.period !== period,
            );
            return {
              drafts,
              log: [
                ...kept,
                {
                  meetingId,
                  scopeKey,
                  period,
                  date: entry.date,
                  notes: entry.notes,
                },
              ],
            };
          });
        },
        undoMeeting: (meetingId, scopeKey, period) =>
          set((state) => ({
            log: state.log.filter(
              (entry) =>
                entry.meetingId !== meetingId ||
                entry.scopeKey !== scopeKey ||
                entry.period !== period,
            ),
          })),
      };
    },
    {
      name: RHYTHM_KEY,
      version: RHYTHM_VERSION,
      storage: rhythmStorage,
      migrate: (persisted) => migrateRhythm(persisted),
      partialize: (state) => ({
        log: state.log,
        drafts: state.drafts,
        hydrated: state.hydrated,
      }),
    },
  ),
);
