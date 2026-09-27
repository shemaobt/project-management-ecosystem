import type { MockRole, SessionPersona } from "../contexts/session";

export interface MockPersona extends SessionPersona {
  role: MockRole;
}

/**
 * The four personas of the mocked session. They live with the fixtures because the
 * doubles read them too: in fixture mode the mock role is who the "server" builds the
 * card and the record for (OBT-532). `MockAuthProvider` renders them.
 */
export const MOCK_SESSION_PERSONAS: Record<MockRole, MockPersona> = {
  globalStrategist: {
    id: "mock-global-strategist",
    role: "globalStrategist",
    roles: ["globalStrategist"],
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

export const DEFAULT_MOCK_ROLE: MockRole = "globalStrategist";

/** The mock role the provider last wrote — the default where storage is absent or refuses. */
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
