import { toApiFailure } from "../../../services/api";
import type { formsAPI } from "../../../services/api";
import type { IntakeLink, IntakeLinkCreated } from "../../../types/forms";
import type { ApiFailure } from "../../../types/session";

export type LinkList =
  | { kind: "unread" }
  | { kind: "read"; links: readonly IntakeLink[] }
  | { kind: "failed"; failure: ApiFailure };

export interface LinkListState {
  projectId: string;
  asked: number;
  reading: boolean;
  list: LinkList;
  minted: IntakeLinkCreated | null;
  revoking: readonly string[];
}

export type LinkListEvent =
  | { type: "shown" }
  | { type: "hidden" }
  | { type: "asked"; ticket: number; projectId: string }
  | { type: "listed"; ticket: number; links: readonly IntakeLink[] }
  | { type: "unlisted"; ticket: number; failure: ApiFailure }
  | { type: "minted"; link: IntakeLinkCreated }
  | { type: "revoking"; linkId: string }
  | { type: "revoked"; linkId: string; link: IntakeLink | null };

export const UNREAD: LinkList = { kind: "unread" };

export const NO_LIST: LinkListState = {
  projectId: "",
  asked: 0,
  reading: false,
  list: UNREAD,
  minted: null,
  revoking: [],
};

function withLink(list: LinkList, link: IntakeLink): LinkList {
  if (list.kind !== "read") return list;
  const known = list.links.some((row) => row.id === link.id);
  return {
    kind: "read",
    links: known
      ? list.links.map((row) => (row.id === link.id ? link : row))
      : [link, ...list.links],
  };
}

export function linkListReducer(state: LinkListState, event: LinkListEvent): LinkListState {
  switch (event.type) {
    case "shown":
    case "hidden":
      return state.minted ? { ...state, minted: null } : state;
    case "asked":
      return event.projectId === state.projectId
        ? { ...state, asked: event.ticket, reading: true }
        : {
            ...state,
            projectId: event.projectId,
            asked: event.ticket,
            reading: true,
            list: UNREAD,
            minted: null,
          };
    case "listed":
      return event.ticket === state.asked
        ? { ...state, reading: false, list: { kind: "read", links: event.links } }
        : state;
    case "unlisted":
      return event.ticket === state.asked
        ? { ...state, reading: false, list: { kind: "failed", failure: event.failure } }
        : state;
    case "minted":
      return event.link.projectId === state.projectId
        ? { ...state, list: withLink(state.list, event.link), minted: event.link }
        : state;
    case "revoking":
      return { ...state, revoking: [...state.revoking, event.linkId] };
    case "revoked": {
      const revoking = state.revoking.filter((id) => id !== event.linkId);
      const landed = event.link !== null && event.link.projectId === state.projectId;
      return {
        ...state,
        revoking,
        list: landed && event.link ? withLink(state.list, event.link) : state.list,
      };
    }
  }
}

export interface LinkListView {
  list: LinkList;
  minted: IntakeLinkCreated | null;
  revoking: readonly string[];
}

export function viewFor(state: LinkListState, projectId: string): LinkListView {
  return state.projectId === projectId
    ? { list: state.list, minted: state.minted, revoking: state.revoking }
    : { list: UNREAD, minted: null, revoking: state.revoking };
}

export type LinkListAPI = Pick<
  typeof formsAPI,
  "listIntakeLinks" | "mintIntakeLink" | "revokeIntakeLink"
>;

export interface LinkListStore {
  get: () => LinkListState;
  subscribe: (listener: () => void) => () => void;
  show: (projectId: string) => void;
  hide: () => void;
  read: (projectId: string) => void;
  mint: (projectId: string) => Promise<void>;
  revoke: (linkId: string) => Promise<void>;
}

/**
 * A read asked before a write can answer after it, with the status from before (OBT-661): every
 * read carries a ticket and only the latest one lands, and a write that answers while the list
 * is being read — or is not read — asks a new read, so the one in the air never lands.
 */
export function createLinkListStore(
  api: LinkListAPI,
  initial: LinkListState = NO_LIST,
): LinkListStore {
  let state = initial;
  let tickets = 0;
  const listeners = new Set<() => void>();

  const dispatch = (event: LinkListEvent) => {
    const next = linkListReducer(state, event);
    if (next === state) return;
    state = next;
    listeners.forEach((listener) => listener());
  };

  const read = (projectId: string) => {
    const ticket = (tickets += 1);
    dispatch({ type: "asked", ticket, projectId });
    api.listIntakeLinks(projectId).then(
      (links) => dispatch({ type: "listed", ticket, links }),
      (raw: unknown) => dispatch({ type: "unlisted", ticket, failure: toApiFailure(raw) }),
    );
  };

  const settled = (link: IntakeLink, write: LinkListEvent) => {
    const before = state;
    dispatch(write);
    const open = link.projectId === before.projectId;
    if (open && (before.reading || before.list.kind !== "read")) read(link.projectId);
  };

  return {
    get: () => state,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    show: (projectId) => {
      dispatch({ type: "shown" });
      read(projectId);
    },
    hide: () => dispatch({ type: "hidden" }),
    read,
    mint: async (projectId) => {
      const link = await api.mintIntakeLink({ projectId });
      settled(link, { type: "minted", link });
    },
    revoke: async (linkId) => {
      dispatch({ type: "revoking", linkId });
      let link: IntakeLink;
      try {
        link = await api.revokeIntakeLink(linkId);
      } catch (raw) {
        dispatch({ type: "revoked", linkId, link: null });
        throw raw;
      }
      settled(link, { type: "revoked", linkId, link });
    },
  };
}
