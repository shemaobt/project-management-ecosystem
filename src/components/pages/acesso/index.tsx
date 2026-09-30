import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../../contexts/AuthContext";
import type { AccessAPI } from "../../../services/api";
import { canAdministerAccess } from "../../../utils/access";
import { HistorySection } from "./HistorySection";
import { InvitesSection, type InvitePrefill } from "./InvitesSection";
import { NotAuthorized } from "./NotAuthorized";
import { PendingProjectsSection } from "./PendingProjects";
import { PersonSection } from "./PersonSection";

export interface AcessoPageProps {
  api: AccessAPI;
}

export function AcessoPage({ api }: AcessoPageProps) {
  const { user } = useAuth();
  return canAdministerAccess(user) ? <AccessScreen api={api} /> : <NotAuthorized />;
}

function AccessScreen({ api }: AcessoPageProps) {
  const { t } = useTranslation();
  const [revision, setRevision] = useState(0);
  const [prefill, setPrefill] = useState<InvitePrefill>({ email: "", nonce: 0 });

  const invite = (email: string) => {
    setPrefill((current) => ({ email, nonce: current.nonce + 1 }));
    document.getElementById("convites")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section className="mx-auto w-full max-w-(--container-reading) px-(--container-pad) pt-8 pb-20">
      <header className="mb-6">
        <p className="mb-2.5 text-eyebrow font-bold tracking-eyebrow uppercase text-telha">
          {t("acesso_eyebrow")}
        </p>
        <h1 className="mb-3 text-h2 leading-tight font-black tracking-tight text-balance text-fg-strong">
          {t("acesso_title")}
        </h1>
        <p className="max-w-[72ch] font-serif text-lead leading-normal text-pretty italic text-fg-muted">
          {t("acesso_lead")}
        </p>
      </header>

      <div className="flex flex-col gap-6">
        <PersonSection
          api={api}
          onChanged={() => setRevision((current) => current + 1)}
          onInvite={invite}
        />
        <PendingProjectsSection
          api={api}
          onChanged={() => setRevision((current) => current + 1)}
        />
        <InvitesSection api={api} prefill={prefill} revision={revision} />
        <HistorySection api={api} revision={revision} />
      </div>
    </section>
  );
}
