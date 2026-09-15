import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  type ReactNode,
} from "react";
import {
  authAPI,
  onSessionEvent,
  sessionAPI,
  toApiFailure,
} from "../services/api";
import { useRegionsStore } from "../stores/regionsStore";
import { ANONYMOUS, apiSessionReducer, personaOf } from "./apiSession";
import { AuthContext, scopeRegions, type AuthSession } from "./session";

export function ApiAuthProvider({ children }: { children: ReactNode }) {
  const [{ status, signed, failure }, dispatch] = useReducer(
    apiSessionReducer,
    ANONYMOUS,
  );

  const regions = useRegionsStore((state) => state.regions);
  const regionsHydrated = useRegionsStore((state) => state.hydrated);
  const hydrateRegions = useRegionsStore((state) => state.hydrate);

  useEffect(() => {
    if (status === "ready") void hydrateRegions();
  }, [status, hydrateRegions]);

  useEffect(
    () =>
      onSessionEvent((event) => {
        if (event === "expired") dispatch({ type: "expired" });
        if (event === "signedOut") dispatch({ type: "dropped" });
      }),
    [],
  );

  const signIn = useCallback(async (email: string, password: string) => {
    dispatch({ type: "proving" });
    try {
      const account = await authAPI.signIn({ email, password });
      const session = await sessionAPI.get();
      dispatch({ type: "proved", accountId: account.id, session });
    } catch (error) {
      await authAPI.signOut();
      dispatch({ type: "refused", failure: toApiFailure(error) });
    }
  }, []);

  const signOut = useCallback(async () => {
    await authAPI.signOut();
    dispatch({ type: "left" });
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
