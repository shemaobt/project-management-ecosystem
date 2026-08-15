import { useTranslation } from "react-i18next";
import { GLOBAL_ROLE_LABEL_KEY, TEAM_BODIES } from "../../../constants/team";
import { surfaceOutlined } from "../../../styles";
import { cn } from "../../../utils/cn";

export function Leadership() {
  const { t } = useTranslation();

  return (
    <section className={cn("rounded-lg p-6 shadow-card", surfaceOutlined)}>
      <h2 className="text-h4 leading-tight font-black tracking-tight text-fg-strong">
        {t("equipe_bodies_title")}
      </h2>

      <div className="mt-4 grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
        <article className="rounded-md bg-accent-soft px-4 py-3.5">
          <p className="text-tag font-bold tracking-button uppercase text-telha">
            {t("equipe_body_leadership_scope")}
          </p>
          <p className="mt-1 text-small font-semibold text-fg-strong">
            {t(GLOBAL_ROLE_LABEL_KEY)}
          </p>
          <p className="mt-1 text-tag leading-normal text-fg-muted">
            {t("equipe_global_scope")}
          </p>
        </article>

        {TEAM_BODIES.map((body) => (
          <article key={body.key} className="rounded-md bg-muted px-4 py-3.5">
            <p className="text-tag font-bold tracking-button uppercase text-fg-subtle">
              {t(body.scopeKey)}
            </p>
            <p className="mt-1 text-small font-semibold text-fg-strong">
              {t(body.labelKey)}
            </p>
            <p className="mt-1 text-tag leading-normal text-fg-muted">
              {t(body.purposeKey)}
            </p>
          </article>
        ))}
      </div>

      <p className="mt-4 max-w-[80ch] text-micro leading-normal text-fg-subtle">
        {t("equipe_no_hierarchy")}
      </p>
    </section>
  );
}
