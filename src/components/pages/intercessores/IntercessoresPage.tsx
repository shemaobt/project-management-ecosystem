import { useTranslation } from "react-i18next";
import { EmptyState } from "../../common/EmptyState";

export function IntercessoresPage() {
  const { t } = useTranslation();

  return (
    <section className="mx-auto max-w-(--container-max) px-(--container-pad) py-16">
      <EmptyState
        title={t("nav_intercessores")}
        message={`${t("int_lead")} ${t("empty_soon")}`}
      />
    </section>
  );
}
