import { Lock } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { EmptyState } from "../../common/EmptyState";
import { Button } from "../../ui";

export function NotAuthorized() {
  const { t } = useTranslation();

  return (
    <section className="mx-auto w-full max-w-(--container-reading) px-(--container-pad) pt-8 pb-20">
      <h1 className="mb-6 text-h2 leading-tight font-black tracking-tight text-balance text-fg-strong">
        {t("acesso_title")}
      </h1>
      <EmptyState
        icon={<Lock size={28} strokeWidth={1.75} aria-hidden />}
        title={t("acesso_denied_title")}
        message={t("acesso_denied_body")}
        action={
          <Button asChild variant="secondary" size="sm">
            <Link to="/projetos">{t("acesso_denied_back")}</Link>
          </Button>
        }
      />
    </section>
  );
}
