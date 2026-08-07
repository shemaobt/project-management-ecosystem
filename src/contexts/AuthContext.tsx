import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useRegionsStore } from "../stores/regionsStore";
import type { Region, RegionKey } from "../types/region";
import type { RoleKey } from "../types/role";

export type SessionRole = "globalStrategist" | RoleKey;
export type SessionStatus = "loading" | "ready";

export interface SessionPersona {
  id: string;
  role: SessionRole;
  regionScope: RegionKey[] | null;
}

export interface SessionUser extends SessionPersona {
  name: string;
}

export interface AuthSession {
  status: SessionStatus;
  user: SessionUser;
  visibleRegions: Region[];
  canSeeRegion: (key: RegionKey) => boolean;
  switchRole: (role: SessionRole) => void;
}

const SESSION_KEY = "shema-session-v1";

const GLOBAL_STRATEGIST_NAME = "Karina Marinho";
const UNASSIGNED_HOLDER_NAME = "— a definir";

export const SESSION_ROLE_LABELS: Record<SessionRole, string> = {
  globalStrategist: "Estrategista Global",
  coordinator: "Administrador",
  obtLab: "Operacional de Línguas",
  resourceCircle: "Intercessor",
};

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
): string {
  if (persona.role === "globalStrategist") return GLOBAL_STRATEGIST_NAME;
  for (const key of persona.regionScope ?? []) {
    const holder = regions.find((region) => region.key === key)?.team[
      persona.role
    ];
    if (holder) return holder;
  }
  return UNASSIGNED_HOLDER_NAME;
}

export function scopeRegions(
  regions: Region[],
  persona: SessionPersona,
): Region[] {
  const scope = persona.regionScope;
  if (!scope) return regions;
  return regions.filter((region) => scope.includes(region.key));
}

const AuthContext = createContext<AuthSession | null>(null);

function loadStoredRole(): SessionRole {
  const stored = localStorage.getItem(SESSION_KEY);
  return stored && stored in MOCK_SESSION_PERSONAS
    ? (stored as SessionRole)
    : "globalStrategist";
}

export function AuthProvider({ children }: { children: ReactNode }) {
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
      canSeeRegion: (key) => visibleRegions.some((region) => region.key === key),
      switchRole: setRole,
    };
  }, [role, regions, hydrated]);

  return (
    <AuthContext.Provider value={session}>{children}</AuthContext.Provider>
  );
}

export function useAuth(): AuthSession {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
