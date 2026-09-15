import type { ReactNode } from "react";
import { resolveSource } from "../services/api";
import { ApiAuthProvider } from "./ApiAuthProvider";
import { MockAuthProvider } from "./MockAuthProvider";

export { MOCK_SESSION_PERSONAS, resolvePersonaName } from "./MockAuthProvider";

export {
  SESSION_ROLE_LABEL_KEYS,
  UNASSIGNED_HOLDER_KEY,
  scopeRegions,
  useAuth,
} from "./session";

export type {
  AuthSession,
  SessionPersona,
  SessionRole,
  SessionStatus,
  SessionUser,
} from "./session";

export const SESSION_IS_MOCKED = resolveSource("session") !== "api";

export function AuthProvider({ children }: { children: ReactNode }) {
  return SESSION_IS_MOCKED ? (
    <MockAuthProvider>{children}</MockAuthProvider>
  ) : (
    <ApiAuthProvider>{children}</ApiAuthProvider>
  );
}
