import type { MockRole, SessionPersona } from "../contexts/session";
import type { RoleKey } from "../types/role";

/** The head role is always one of the org chart's three — the Admin persona opens by `coordinator` (OBT-572). */
export interface MockPersona extends SessionPersona {
  role: RoleKey;
}

/**
 * The four personas of the mocked session. They live with the fixtures because the
 * doubles read them too: in fixture mode the mock role is who the "server" builds the
 * card and the record for (OBT-532). `MockAuthProvider` renders them.
 *
 * Nobody is global by role since OBT-572: the Admin is the one reader who coordinates
 * everywhere (`_scope.readership`), and this persona also holds `coordinator` with no
 * region, which is what puts her in the health audience — the shape an Admin takes once
 * she grants herself the seat the migration took away. The list is in the server's
 * precedence (`coordinator` before `admin`) and `role` is its head, as `readSession`
 * would demand of the same pair on the wire; the persona's key stays `admin`.
 */
export const MOCK_SESSION_PERSONAS: Record<MockRole, MockPersona> = {
  admin: {
    id: "mock-admin",
    role: "coordinator",
    roles: ["coordinator", "admin"],
    regionScope: null,
  },
  coordinator: {
    id: "mock-coordinator",
    role: "coordinator",
    roles: ["coordinator"],
    regionScope: ["south-america"],
  },
  obtLab: {
    id: "mock-obt-lab",
    role: "obtLab",
    roles: ["obtLab"],
    regionScope: ["africa"],
  },
  resourceCircle: {
    id: "mock-resource-circle",
    role: "resourceCircle",
    roles: ["resourceCircle"],
    regionScope: ["oceania"],
  },
};

export const MOCK_SESSION_KEY = "shema-session-v1";

const DEFAULT_MOCK_ROLE: MockRole = "admin";

export function readMockRole(): MockRole {
  try {
    const stored =
      typeof localStorage === "undefined"
        ? null
        : localStorage.getItem(MOCK_SESSION_KEY);
    return stored && stored in MOCK_SESSION_PERSONAS
      ? (stored as MockRole)
      : DEFAULT_MOCK_ROLE;
  } catch {
    return DEFAULT_MOCK_ROLE;
  }
}

export function mockPersona(): MockPersona {
  return MOCK_SESSION_PERSONAS[readMockRole()];
}
