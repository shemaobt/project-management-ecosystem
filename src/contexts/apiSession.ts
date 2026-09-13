import type { ApiFailure, ShemaSession } from "../types/session";
import type { SessionStatus } from "./session";

export interface SignedSession {
  accountId: string;
  session: ShemaSession;
}

export interface ApiSessionState {
  status: SessionStatus;
  signed: SignedSession | null;
  failure: ApiFailure | null;
  proving: boolean;
}

export type ApiSessionAction =
  | { type: "proving" }
  | { type: "proved"; accountId: string; session: ShemaSession }
  | { type: "refused"; failure: ApiFailure }
  | { type: "expired" }
  | { type: "dropped" }
  | { type: "left" };

export const ANONYMOUS: ApiSessionState = {
  status: "anonymous",
  signed: null,
  failure: null,
  proving: false,
};

function statusAfterRefusedSignIn(before: SessionStatus): SessionStatus {
  return before === "expired" ? "expired" : "anonymous";
}

export function apiSessionReducer(
  state: ApiSessionState,
  action: ApiSessionAction,
): ApiSessionState {
  switch (action.type) {
    case "proving":
      return { ...state, failure: null, proving: true };
    case "proved":
      return {
        status: "ready",
        signed: { accountId: action.accountId, session: action.session },
        failure: null,
        proving: false,
      };
    case "refused":
      return {
        status: statusAfterRefusedSignIn(state.status),
        signed: null,
        failure: action.failure,
        proving: false,
      };
    case "expired":
      if (state.proving) return state;
      return { ...state, status: "expired" };
    case "dropped":
      if (state.proving) return state;
      return { ...state, status: "anonymous", signed: null };
    case "left":
      return ANONYMOUS;
  }
}
