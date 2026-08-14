import { create } from "zustand";
import { persist } from "zustand/middleware";
import { meetingsAPI } from "../fixtures";
import type { MeetingCadence, MeetingId, MeetingLogEntry } from "../types/meeting";
import { parseIsoDate, periodKey } from "../utils/cadence";
import type { MeetingScopeKey } from "../utils/rhythm";
import { createDeferredJsonStorage } from "./draftStorage";

const RHYTHM_KEY = "shema-rhythm-v1";

export const RHYTHM_VERSION = 1;

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

interface RhythmState {
  log: MeetingLogEntry[];
  drafts: Record<string, MeetingNote>;
  hydrated: boolean;
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

const rhythmStorage = createDeferredJsonStorage<PersistedRhythm>();

export const useRhythmStore = create<RhythmState>()(
  persist<RhythmState, [], [], PersistedRhythm>(
    (set, get) => ({
      log: [],
      drafts: {},
      hydrated: false,
      hydrate: async () => {
        if (get().hydrated) return;
        const log = await meetingsAPI.log();
        set({ log, hydrated: true });
      },
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
    }),
    {
      name: RHYTHM_KEY,
      version: RHYTHM_VERSION,
      storage: rhythmStorage,
      migrate: () => ({ log: [], drafts: {}, hydrated: false }),
      partialize: (state) => ({
        log: state.log,
        drafts: state.drafts,
        hydrated: state.hydrated,
      }),
    },
  ),
);
