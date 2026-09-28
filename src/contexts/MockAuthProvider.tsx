import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  MOCK_SESSION_KEY,
  MOCK_SESSION_PERSONAS,
  readMockRole,
  type MockPersona,
} from "../services/api";
import { useRegionsStore } from "../stores/regionsStore";
import type { Region } from "../types/region";
import {
  AuthContext,
  scopeRegions,
  type AuthSession,
  type MockRole,
  type SessionUser,
} from "./session";

const GLOBAL_STRATEGIST_NAME = "Karina Marinho";

export function resolvePersonaName(
  persona: MockPersona,
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

export function MockAuthProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<MockRole>(readMockRole);
  const regions = useRegionsStore((state) => state.regions);
  const hydrated = useRegionsStore((state) => state.hydrated);
  const hydrate = useRegionsStore((state) => state.hydrate);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  // A layout effect runs before the children's effects, so the doubles that read the mock
  // role (fixtures/session.ts) see the one this render is for when the children fetch.
  useLayoutEffect(() => {
    localStorage.setItem(MOCK_SESSION_KEY, role);
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
