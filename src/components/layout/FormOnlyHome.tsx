import { ExternalLink } from "lucide-react";
import { useTranslation } from "react-i18next";
import { EmptyState } from "../common/EmptyState";

export interface FormOnlyHomeProps {
  formAvailable: boolean;
}

export function FormOnlyHome({ formAvailable }: FormOnlyHomeProps) {
  const { t } = useTranslation();

  return (
    <section className="mx-auto w-full max-w-(--container-reading) px-(--container-pad) pt-8 pb-20">
      <h1 className="mb-6 text-h2 leading-tight font-black tracking-tight text-balance text-fg-strong">
        {t("ritmo_role_resourcecircle")}
      </h1>
      <EmptyState
        icon={<ExternalLink size={28} strokeWidth={1.75} aria-hidden />}
        title={t("rr_home_title")}
        message={
          formAvailable
            ? t("rr_home_body", { entry: t("ritmo_role_resourcecircle") })
            : t("rr_form_unavailable", { admin: t("role_admin") })
        }
      />
    </section>
  );
}
