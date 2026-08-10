import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { EmptyState } from "../../common/EmptyState";
import { Button } from "../../ui";

export function OracaoPage() {
  const { t } = useTranslation();

  return (
    <section className="mx-auto max-w-(--container-max) px-(--container-pad) py-16">
      <EmptyState
        title={t("nav_oracao")}
        message={`${t("oracao_lead")} ${t("empty_soon")}`}
        action={
          <Button asChild variant="secondary">
            <Link to="/oracao/intercessores">{t("nav_intercessores")}</Link>
          </Button>
        }
      />
    </section>
  );
}
