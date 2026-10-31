import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { announceFailure, intercessorsAPI, toApiFailure } from "../services/api";
import type { ConsentContext, IntercessorEntry } from "../types/prayer";
import type { ApiFailure } from "../types/session";
import {
  makeDirectoryConsentByContact,
  makeIntercessorCreate,
  makeIntercessorUpdate,
  type DirectoryGrantDraft,
  type IntercessorCreateDraft,
  type IntercessorEditDraft,
} from "../utils/intercessors";
import {
  createHydrationSlot,
  hydrateOnce,
  NOT_HYDRATED,
  type HydrationStatus,
} from "./hydration";

const INTERCESSORS_KEY = "shema-intercessors-v1";

// 3: entries carry the one-year review (`reviewDue`, `reviewedAt`, `lastSentAt`) and the
// directory the count of withheld people past their year — an older cache has neither.
export const INTERCESSORS_VERSION = 3;

/**
 * What listing somebody already in the network by their contact came to (OBT-681). The two
 * refusals are kept apart from `failed` because the dialog says them in the console's own
 * words — the server's sentence is English and names nothing the coordinator can act on.
 */
export type DirectoryListing =
  | { kind: "listed"; entry: IntercessorEntry }
  | { kind: "already"; entry: IntercessorEntry }
  | { kind: "notFound" }
  | { kind: "ambiguous" }
  | { kind: "invalid" }
  | { kind: "failed"; failure: ApiFailure };

interface PrayerState extends HydrationStatus {
  intercessors: IntercessorEntry[];
  /**
   * The server refused the network to this reader (403). A reading, not an error: the page
   * says whose the network is and stays that way, instead of a spinner or a toast that goes.
   */
  forbidden: boolean;
  /** People the network holds who withheld `directory` consent — a count, never a name (§8.1 rule 2's precedent). */
  withheldCount: number;
  /** Of those, how many are past their year (OBT-531) — a count, never a name. */
  withheldReviewDueCount: number;
  hydrate: () => Promise<void>;
  /**
   * Fetch the network again even when a cache is on screen. The review flag is computed by
   * the server against today, so a list kept from a week ago says nothing true about it.
   */
  reload: () => Promise<void>;
  addIntercessor: (draft: IntercessorCreateDraft) => Promise<boolean>;
  updateIntercessor: (id: string, draft: IntercessorEditDraft) => Promise<boolean>;
  removeIntercessor: (id: string) => Promise<boolean>;
  revealContact: (id: string) => Promise<string | null>;
  /** "Revisado": the server stamps the review and answers the entry without the flag. */
  reviewIntercessor: (id: string) => Promise<boolean>;
  /**
   * `directory` for a member the list does not show, found by their contact (OBT-681). Not
   * through `safely`: its toast would lose which refusal it was. The typed contact is sent and
   * forgotten — nothing of it reaches the store's state or the tab's storage.
   */
  listWithheld: (draft: DirectoryGrantDraft) => Promise<DirectoryListing>;
}

type PersistedPrayer = Pick<
  PrayerState,
  "intercessors" | "withheldCount" | "withheldReviewDueCount" | "hydrated" | "forbidden"
>;

async function safely<T>(action: () => Promise<T>): Promise<T | null> {
  try {
    return await action();
  } catch (error) {
    announceFailure(toApiFailure(error));
    return null;
  }
}

export const usePrayerStore = create<PrayerState>()(
  persist<PrayerState, [], [], PersistedPrayer>(
    (set, get) => {
      const slot = createHydrationSlot();
      const load = async () => {
        try {
          const directory = await intercessorsAPI.list();
          set({
            intercessors: directory.people,
            withheldCount: directory.withheldCount,
            withheldReviewDueCount: directory.withheldReviewDueCount,
            forbidden: false,
          });
        } catch (error) {
          if (toApiFailure(error).kind !== "forbidden") throw error;
          set({
            intercessors: [],
            withheldCount: 0,
            withheldReviewDueCount: 0,
            forbidden: true,
          });
        }
      };

      return {
        intercessors: [],
        forbidden: false,
        withheldCount: 0,
        withheldReviewDueCount: 0,
        ...NOT_HYDRATED,
        hydrate: () => hydrateOnce(slot, get, set, load),
        reload: () => hydrateOnce(slot, get, set, load, true),
        addIntercessor: async (draft) => {
          const payload = makeIntercessorCreate(draft);
          if (!payload) return false;

          const created = await safely(() => intercessorsAPI.create(payload));
          if (!created) return false;

          if (!draft.listInDirectory) {
            set((state) => ({ withheldCount: state.withheldCount + 1 }));
            return true;
          }

          const listed = await safely(() =>
            intercessorsAPI.grantConsent(
              created.id,
              "directory",
              payload.consentBasis,
            ),
          );
          const entry = listed ?? created;
          if (!listed) {
            // The person is held but not shown until the directory consent
            // lands — announced already by `safely`, so the count carries it.
            set((state) => ({ withheldCount: state.withheldCount + 1 }));
            return true;
          }
          set((state) => ({ intercessors: [entry, ...state.intercessors] }));
          return true;
        },
        updateIntercessor: async (id, draft) => {
          const payload = makeIntercessorUpdate(draft);
          if (!payload) return false;

          const updated = await safely(() => intercessorsAPI.update(id, payload));
          if (!updated) return false;

          set((state) => ({
            intercessors: state.intercessors.map((person) =>
              person.id === id ? updated : person,
            ),
          }));
          return true;
        },
        removeIntercessor: async (id) => {
          const ok = (await safely(() => intercessorsAPI.remove(id))) !== null;
          if (!ok) return false;

          set((state) => ({
            intercessors: state.intercessors.filter((person) => person.id !== id),
          }));
          return true;
        },
        revealContact: (id) => safely(() => intercessorsAPI.contact(id)),
        listWithheld: async (draft) => {
          const payload = makeDirectoryConsentByContact(draft);
          if (!payload) return { kind: "invalid" };

          let answer: { entry: IntercessorEntry; recorded: boolean };
          try {
            answer = await intercessorsAPI.grantDirectoryByContact(payload);
          } catch (error) {
            const failure = toApiFailure(error);
            if (failure.kind === "notFound") return { kind: "notFound" };
            if (failure.kind === "conflict") return { kind: "ambiguous" };
            return { kind: "failed", failure };
          }

          const { entry, recorded } = answer;
          set((state) =>
            state.intercessors.some((person) => person.id === entry.id)
              ? state
              : { intercessors: [entry, ...state.intercessors] },
          );
          // The withheld counts are read again rather than adjusted here: another session may
          // have added or listed somebody since this page read them.
          await get().reload();
          return recorded ? { kind: "listed", entry } : { kind: "already", entry };
        },
        reviewIntercessor: async (id) => {
          const reviewed = await safely(() => intercessorsAPI.review(id));
          if (!reviewed) return false;

          set((state) => ({
            intercessors: state.intercessors.map((person) =>
              person.id === id ? reviewed : person,
            ),
          }));
          return true;
        },
      };
    },
    {
      name: INTERCESSORS_KEY,
      version: INTERCESSORS_VERSION,
      // **The tab's session, never the device** (INT-06 · OBT-411). The network holds people's
      // names and contacts, and a shared or borrowed phone is a normal circumstance in the
      // field: closing the tab drops the list, and the next visit reads it again from the
      // server, which is where it lives. `localStorage` kept it for good.
      storage: createJSONStorage(() => sessionStorage),
      migrate: () => ({
        intercessors: [],
        withheldCount: 0,
        withheldReviewDueCount: 0,
        hydrated: false,
        forbidden: false,
      }),
      partialize: (state) => ({
        intercessors: state.intercessors,
        withheldCount: state.withheldCount,
        withheldReviewDueCount: state.withheldReviewDueCount,
        hydrated: state.hydrated,
        forbidden: state.forbidden,
      }),
    },
  ),
);

export type { ConsentContext };
