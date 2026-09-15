import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useRegionsStore } from "../stores/regionsStore";
import type { Region } from "../types/region";
import {
  AuthContext,
  scopeRegions,
  type AuthSession,
  type SessionPersona,
  type SessionRole,
  type SessionUser,
} from "./session";

const SESSION_KEY = "shema-session-v1";

const GLOBAL_STRATEGIST_NAME = "Karina Marinho";

export const MOCK_SESSION_PERSONAS: Record<SessionRole, SessionPersona> = {
  globalStrategist: {
    id: "mock-global-strategist",
    role: "globalStrategist",
    regionScope: null,
  },
  coordinator: {
    id: "mock-coordinator",
    role: "coordinator",
    regionScope: ["south-america"],
  },
  obtLab: {
    id: "mock-obt-lab",
    role: "obtLab",
    regionScope: ["africa"],
  },
  resourceCircle: {
    id: "mock-resource-circle",
    role: "resourceCircle",
    regionScope: ["oceania"],
  },
};

export function resolvePersonaName(
  persona: SessionPersona,
  regions: Region[],
): string | null {
  if (persona.role === "globalStrategist") return GLOBAL_STRATEGIST_NAME;
  for (const key of persona.regionScope ?? []) {
    const holder = regions.find((region) => region.key === key)?.team[
      persona.role
    ];
    if (holder) return holder;
  }
  return null;
}

function loadStoredRole(): SessionRole {
  const stored = localStorage.getItem(SESSION_KEY);
  return stored && stored in MOCK_SESSION_PERSONAS
    ? (stored as SessionRole)
    : "globalStrategist";
}

export function MockAuthProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<SessionRole>(loadStoredRole);
  const regions = useRegionsStore((state) => state.regions);
  const hydrated = useRegionsStore((state) => state.hydrated);
  const hydrate = useRegionsStore((state) => state.hydrate);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  useEffect(() => {
    localStorage.setItem(SESSION_KEY, role);
  }, [role]);

  const session = useMemo<AuthSession>(() => {
    const persona = MOCK_SESSION_PERSONAS[role];
    const user: SessionUser = {
      ...persona,
      name: resolvePersonaName(persona, regions),
    };
    const visibleRegions = hydrated ? scopeRegions(regions, persona) : [];
    return {
      status: hydrated ? "ready" : "loading",
      user,
      visibleRegions,
      canSeeRegion: (key) =>
        visibleRegions.some((region) => region.key === key),
      signIn: null,
      signOut: null,
      switchRole: setRole,
      failure: null,
    };
  }, [role, regions, hydrated]);

  return (
    <AuthContext.Provider value={session}>{children}</AuthContext.Provider>
  );
}
