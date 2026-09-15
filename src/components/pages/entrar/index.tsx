import { useTranslation } from "react-i18next";
import type { ApiFailure } from "../../../types/session";
import { BrandMark } from "../../common/BrandMark";
import { CredentialsForm } from "./CredentialsForm";

export interface EntrarViewProps {
  onSubmit: (email: string, password: string) => Promise<void>;
  failure: ApiFailure | null;
}

export function EntrarView({ onSubmit, failure }: EntrarViewProps) {
  const { t } = useTranslation();

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-canvas px-5 py-12">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-8 -right-8 [font-family:serif] text-[220px] leading-none font-light text-telha/[0.06] select-none"
      >
        שמע
      </div>

      <section className="relative w-full max-w-modal-narrow rounded-lg bg-elevated p-8 shadow-card sm:p-10">
        <BrandMark className="mb-5 text-verde-claro" />

        <p className="text-[11px] font-bold tracking-[0.18em] text-telha uppercase">
          {t("app_title")}
        </p>
        <h1 className="mt-1.5 font-serif text-h3 leading-snug font-normal text-fg italic">
          {t("entrar_title")}
        </h1>
        <p className="mt-2 mb-7 max-w-[46ch] text-small leading-normal text-fg-muted">
          {t("entrar_lead")}
        </p>

        <CredentialsForm onSubmit={onSubmit} failure={failure} />

        <p className="mt-6 border-t border-line pt-4 text-micro leading-[1.5] text-fg-subtle">
          {t("entrar_session_note")}
        </p>
      </section>
    </main>
  );
}
