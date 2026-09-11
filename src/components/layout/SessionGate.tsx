import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../contexts/AuthContext";
import { LoadingSpinner } from "../common/LoadingSpinner";
import { EntrarView } from "../pages/entrar";
import { SessionExpired } from "../pages/entrar/SessionExpired";

export function SessionGate({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const { status, signIn, signOut, failure } = useAuth();

  if (!signIn || !signOut) return <>{children}</>;

  if (status === "anonymous") {
    return <EntrarView onSubmit={signIn} failure={failure} />;
  }

  if (status === "loading") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-canvas">
        <LoadingSpinner size="lg" label={t("entrar_loading")} />
      </main>
    );
  }

  return (
    <>
      {children}
      <SessionExpired
        open={status === "expired"}
        onSubmit={signIn}
        onSignOut={signOut}
        failure={failure}
      />
    </>
  );
}
