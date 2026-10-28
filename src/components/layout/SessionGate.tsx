import { useEffect, useRef, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { LoadingSpinner } from "../common/LoadingSpinner";
import { EntrarView } from "../pages/entrar";
import { SessionExpired } from "../pages/entrar/SessionExpired";
import {
  SIGNED_OUT_ADDRESS,
  forgetsAddress,
  sessionSurface,
} from "./sessionSurface";

export function SessionGate({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const { status, signIn, signOut, failure } = useAuth();
  const surface = sessionSurface(status, Boolean(signIn && signOut));
  const navigate = useNavigate();
  const shown = useRef(surface);

  useEffect(() => {
    const from = shown.current;
    shown.current = surface;
    if (forgetsAddress(from, surface)) {
      navigate(SIGNED_OUT_ADDRESS, { replace: true });
    }
  }, [surface, navigate]);

  if (surface === "signIn" && signIn) {
    return <EntrarView onSubmit={signIn} failure={failure} />;
  }

  if (surface === "loading") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-canvas">
        <LoadingSpinner size="lg" label={t("entrar_loading")} />
      </main>
    );
  }

  return (
    <>
      {children}
      {signIn && signOut ? (
        <SessionExpired
          open={surface === "reauth"}
          onSubmit={signIn}
          onSignOut={signOut}
          failure={failure}
        />
      ) : null}
    </>
  );
}
