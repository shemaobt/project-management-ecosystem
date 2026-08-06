import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { regionsAPI } from "../fixtures";
import type { Region, RegionKey } from "../types/region";
import type { RoleKey } from "../types/role";

export type SessionRole = "globalStrategist" | RoleKey;

export interface SessionUser {
  id: string;
  name: string;
  role: SessionRole;
  regionScope: RegionKey[] | null;
}

export interface AuthSession {
  user: SessionUser;
  visibleRegions: Region[];
  canSeeRegion: (key: RegionKey) => boolean;
  switchRole: (role: SessionRole) => void;
}

const SESSION_KEY = "shema-session-v1";

export const SESSION_ROLE_LABELS: Record<SessionRole, string> = {
  globalStrategist: "Estrategista Global",
  coordinator: "Administrador",
  obtLab: "Operacional de Línguas",
  resourceCircle: "Intercessor",
};

export const MOCK_SESSION_USERS: Record<SessionRole, SessionUser> = {
  globalStrategist: {
    id: "mock-global-strategist",
    name: "Karina Marinho",
    role: "globalStrategist",
    regionScope: null,
  },
  coordinator: {
    id: "mock-coordinator",
    name: "Marcos Andrade",
    role: "coordinator",
    regionScope: ["south-america"],
  },
  obtLab: {
    id: "mock-obt-lab",
    name: "Ruth Kimani",
    role: "obtLab",
    regionScope: ["africa"],
  },
  resourceCircle: {
    id: "mock-resource-circle",
    name: "Ester Lima",
    role: "resourceCircle",
    regionScope: ["oceania"],
  },
};

export function scopeRegions(regions: Region[], user: SessionUser): Region[] {
  const scope = user.regionScope;
  if (!scope) return regions;
  return regions.filter((region) => scope.includes(region.key));
}

const AuthContext = createContext<AuthSession | null>(null);

function loadStoredRole(): SessionRole {
  const stored = localStorage.getItem(SESSION_KEY);
  return stored && stored in MOCK_SESSION_USERS
    ? (stored as SessionRole)
    : "globalStrategist";
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<SessionRole>(loadStoredRole);
  const [regions, setRegions] = useState<Region[]>([]);

  useEffect(() => {
    let active = true;
    regionsAPI.list().then((loaded) => {
      if (active) setRegions(loaded);
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    localStorage.setItem(SESSION_KEY, role);
  }, [role]);

  const session = useMemo<AuthSession>(() => {
    const user = MOCK_SESSION_USERS[role];
    const visibleRegions = scopeRegions(regions, user);
    return {
      user,
      visibleRegions,
      canSeeRegion: (key) => visibleRegions.some((region) => region.key === key),
      switchRole: setRole,
    };
  }, [role, regions]);

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
