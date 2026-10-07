import { createContext, useContext } from "react";
import { ROLE_DEFINITIONS } from "../constants/roles";
import type { Region, RegionKey } from "../types/region";
import type { RoleKey } from "../types/role";
import type { ApiFailure, SessionApps, SessionRole } from "../types/session";

export type { SessionRole };

/** The mocked session's personas: the three Shemá roles and the Admin, who is the only global reader left (OBT-572). */
export type MockRole = "admin" | RoleKey;

export type SessionStatus = "loading" | "anonymous" | "ready" | "expired";

export interface SessionPersona {
  id: string;
  role: SessionRole;
  roles: SessionRole[];
  regionScope: RegionKey[] | null;
}

export interface SessionUser extends SessionPersona {
  name: string | null;
}

export interface AuthSession {
  status: SessionStatus;
  user: SessionUser;
  apps: SessionApps;
  visibleRegions: Region[];
  canSeeRegion: (key: RegionKey) => boolean;
  signIn: ((email: string, password: string) => Promise<void>) | null;
  signOut: (() => Promise<void>) | null;
  switchRole: ((role: MockRole) => void) | null;
  failure: ApiFailure | null;
}

export const UNASSIGNED_HOLDER_KEY = "sb_no_coordinator";

export const NO_APPS: SessionApps = { resourceRequestForm: null };

export const SESSION_ROLE_LABEL_KEYS: Record<SessionRole, string> = {
  coordinator: ROLE_DEFINITIONS.coordinator.labelKey,
  obtLab: ROLE_DEFINITIONS.obtLab.labelKey,
  resourceCircle: ROLE_DEFINITIONS.resourceCircle.labelKey,
  admin: "role_admin",
  gestor: "role_gestor",
  mesa: "role_mesa",
  equipe: "role_equipe",
};

export function scopeRegions(
  regions: Region[],
  persona: SessionPersona,
): Region[] {
  const scope = persona.regionScope;
  if (!scope) return regions;
  return regions.filter((region) => scope.includes(region.key));
}

export const AuthContext = createContext<AuthSession | null>(null);

export function useAuth(): AuthSession {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
