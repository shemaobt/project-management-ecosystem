import { createContext, useContext } from "react";
import { ROLE_DEFINITIONS } from "../constants/roles";
import type { Region, RegionKey } from "../types/region";
import type { ApiFailure, SessionRole } from "../types/session";

export type { SessionRole };

export type SessionStatus = "loading" | "anonymous" | "ready" | "expired";

export interface SessionPersona {
  id: string;
  role: SessionRole;
  regionScope: RegionKey[] | null;
}

export interface SessionUser extends SessionPersona {
  name: string | null;
}

export interface AuthSession {
  status: SessionStatus;
  user: SessionUser;
  visibleRegions: Region[];
  canSeeRegion: (key: RegionKey) => boolean;
  signIn: ((email: string, password: string) => Promise<void>) | null;
  signOut: (() => Promise<void>) | null;
  switchRole: ((role: SessionRole) => void) | null;
  failure: ApiFailure | null;
}

export const UNASSIGNED_HOLDER_KEY = "sb_no_coordinator";

export const SESSION_ROLE_LABEL_KEYS: Record<SessionRole, string> = {
  globalStrategist: "equipe_global",
  coordinator: ROLE_DEFINITIONS.coordinator.labelKey,
  obtLab: ROLE_DEFINITIONS.obtLab.labelKey,
  resourceCircle: ROLE_DEFINITIONS.resourceCircle.labelKey,
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
