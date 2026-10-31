import { toApiFailure, type ResourceRequestsAPI } from "../../../../services/api";
import type { RequestCard } from "../../../../types/request";
import type { ApiFailure } from "../../../../types/session";

export interface RequestListState {
  /** `null` until a read lands: loading, which is not an empty list. */
  cards: readonly RequestCard[] | null;
  failure: ApiFailure | null;
}

export const UNREAD_REQUESTS: RequestListState = { cards: null, failure: null };

/** What `document` says about the tab being shown — all the list needs of it. */
export interface PageVisibility {
  readonly visibilityState: DocumentVisibilityState;
  addEventListener(type: "visibilitychange", listener: () => void): void;
  removeEventListener(type: "visibilitychange", listener: () => void): void;
}

export type RequestListAPI = Pick<ResourceRequestsAPI, "projectRequests">;

export interface RequestList {
  get: () => RequestListState;
  subscribe: (listener: () => void) => () => void;
  /** The mount's read; a second run of the effect (strict mode) asks nothing more. */
  open: () => Promise<void>;
  read: () => Promise<void>;
  /** Reads again each time the page turns visible; the returned function stops listening. */
  rereadOnReturn: (page: PageVisibility) => () => void;
}

/**
 * *Solicitar recurso* opens the form in another tab, so what was started, sent or decided there
 * reaches the panel only when the person comes back (OBT-682). One read is in the air at a time;
 * a return while one is on its way marks it, and its answer — which may predate what was done in
 * the other tab — is dropped for one more read: `projectsStore`'s `asked` (OBT-663). A failed
 * read again keeps the cards already shown, the next return being the retry, as the bell's poll
 * (INT-11); the failure is said only while nothing was read.
 */
export function createRequestList(api: RequestListAPI, projectId: string): RequestList {
  let state = UNREAD_REQUESTS;
  let pending: Promise<void> | null = null;
  let asked = 0;
  const listeners = new Set<() => void>();

  const set = (next: RequestListState) => {
    state = next;
    listeners.forEach((listener) => listener());
  };

  const load = async (): Promise<void> => {
    const seen = asked;
    const cards = await api.projectRequests(projectId);
    if (seen !== asked) return load();
    set({ cards, failure: null });
  };

  const read = (): Promise<void> => {
    asked += 1;
    if (pending) return pending;
    if (state.failure) set(UNREAD_REQUESTS);
    pending = load()
      .catch((raw: unknown) => {
        if (state.cards === null) set({ cards: null, failure: toApiFailure(raw) });
      })
      .finally(() => {
        pending = null;
      });
    return pending;
  };

  return {
    get: () => state,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    open: () => (asked === 0 ? read() : (pending ?? Promise.resolve())),
    read,
    rereadOnReturn: (page) => {
      const onChange = () => {
        if (page.visibilityState === "visible") void read();
      };
      page.addEventListener("visibilitychange", onChange);
      return () => page.removeEventListener("visibilitychange", onChange);
    },
  };
}
