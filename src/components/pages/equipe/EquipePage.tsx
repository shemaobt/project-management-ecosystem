import { useTranslation } from "react-i18next";
import { EmptyState } from "../../common/EmptyState";

export function EquipePage() {
  const { t } = useTranslation();

  return (
    <section className="mx-auto max-w-(--container-max) px-(--container-pad) py-16">
      <EmptyState
        title={t("nav_equipe")}
        message={`${t("equipe_lead")} ${t("empty_soon")}`}
      />
    </section>
  );
}
