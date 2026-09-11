import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  authAPI,
  onSessionEvent,
  sessionAPI,
  toApiFailure,
} from "../services/api";
import { useRegionsStore } from "../stores/regionsStore";
import type { ApiFailure, ShemaSession } from "../types/session";
import {
  AuthContext,
  scopeRegions,
  type AuthSession,
  type SessionPersona,
  type SessionStatus,
} from "./session";

const NOBODY: SessionPersona = {
  id: "",
  role: "globalStrategist",
  regionScope: [],
};

interface Signed {
  accountId: string;
  session: ShemaSession;
}

function personaOf(signed: Signed | null): SessionPersona {
  if (!signed) return NOBODY;
  return {
    id: signed.accountId,
    role: signed.session.role,
    regionScope: signed.session.regionScope,
  };
}

export function ApiAuthProvider({ children }: { children: ReactNode }) {
  const [signed, setSigned] = useState<Signed | null>(null);
  const [status, setStatus] = useState<SessionStatus>("anonymous");
  const [failure, setFailure] = useState<ApiFailure | null>(null);

  const regions = useRegionsStore((state) => state.regions);
  const regionsHydrated = useRegionsStore((state) => state.hydrated);
  const hydrateRegions = useRegionsStore((state) => state.hydrate);

  useEffect(() => {
    if (status === "ready") void hydrateRegions();
  }, [status, hydrateRegions]);

  useEffect(
    () =>
      onSessionEvent((event) => {
        if (event === "expired") setStatus("expired");
        if (event === "signedOut") {
          setSigned(null);
          setStatus("anonymous");
        }
      }),
    [],
  );

  const signIn = useCallback(async (email: string, password: string) => {
    setFailure(null);
    try {
      const account = await authAPI.signIn({ email, password });
      const session = await sessionAPI.get();
      setSigned({ accountId: account.id, session });
      setStatus("ready");
    } catch (error) {
      await authAPI.signOut();
      setSigned(null);
      setStatus("anonymous");
      setFailure(toApiFailure(error));
    }
  }, []);

  const signOut = useCallback(async () => {
    await authAPI.signOut();
    setSigned(null);
    setFailure(null);
    setStatus("anonymous");
  }, []);

  const value = useMemo<AuthSession>(() => {
    const persona = personaOf(signed);
    const visibleRegions =
      signed && regionsHydrated ? scopeRegions(regions, persona) : [];
    return {
      status,
      user: { ...persona, name: signed?.session.name ?? null },
      visibleRegions,
      canSeeRegion: (key) =>
        visibleRegions.some((region) => region.key === key),
      signIn,
      signOut,
      switchRole: null,
      failure,
    };
  }, [signed, status, failure, regions, regionsHydrated, signIn, signOut]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
