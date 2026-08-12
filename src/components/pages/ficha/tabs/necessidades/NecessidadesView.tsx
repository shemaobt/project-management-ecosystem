import { useTranslation } from "react-i18next";
import { NEED_CATEGORIES } from "../../../../../constants/project";
import type { NeedItem } from "../../../../../types/project";
import { formatDate } from "../../../../../utils/format";
import { closedNeeds, openNeeds } from "../../../../../utils/needs";
import { DetailItem } from "../../fields";
import type { DraftHandle } from "../../useDraft";
import { StatusBadge, UrgencyBadge } from "./NeedBadges";

function NeedCard({ need }: { need: NeedItem }) {
  const { t } = useTranslation();
  const locale = t("locale");
  const category = NEED_CATEGORIES.find((entry) => entry.id === need.category);

  return (
    <li className="rounded-[12px] border border-line bg-elevated px-4 py-3.5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[10px] font-bold tracking-[0.1em] uppercase text-fg-muted">
          {category ? t(category.labelKey) : need.category}
        </span>
        <UrgencyBadge urgency={need.urgency} />
        <StatusBadge status={need.status} />
      </div>

      {need.description && (
        <p className="mt-2 font-serif text-[15px] leading-[1.5] text-fg">
          {need.description}
        </p>
      )}

      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-micro text-fg-muted">
        {need.estimatedValue && <span>{need.estimatedValue}</span>}
        {need.deadline && <span>{formatDate(need.deadline, locale)}</span>}
        {need.prayerShared && <span>{t("need_prayer_shared")}</span>}
        {need.prayerAnswered && <span>{t("need_prayer_answered")}</span>}
        {need.submittedBy && <span>{need.submittedBy}</span>}
      </div>

      {need.status === "fulfilled" && (need.fulfilledBy || need.fulfilledDate) && (
        <p className="mt-2 text-micro text-fg">
          {t("need_fulfilled_by")}: <strong>{need.fulfilledBy || "—"}</strong>
          {need.fulfilledDate && ` — ${formatDate(need.fulfilledDate, locale)}`}
        </p>
      )}

      {need.status === "dropped" && need.droppedDate && (
        <p className="mt-2 text-micro text-fg-subtle">
          {t("need_dropped_date")} {formatDate(need.droppedDate, locale)}
        </p>
      )}
    </li>
  );
}

export interface NecessidadesViewProps {
  draft: DraftHandle;
}

export function NecessidadesView({ draft }: NecessidadesViewProps) {
  const { t } = useTranslation();
  const needs = draft.values.needsItems ?? [];
  const open = openNeeds(needs);
  const closed = closedNeeds(needs);

  if (needs.length === 0) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-micro leading-[1.5] text-fg-subtle">
          {t("needs_lead")}
        </p>
        <p className="rounded-[12px] border border-line-strong bg-muted px-4 py-3.5 text-micro leading-[1.5] text-fg">
          {t("needs_empty")}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <section>
        <h3 className="text-[10px] font-bold tracking-[0.14em] uppercase text-fg-muted">
          {t("needs_open_section")} · {t("needs_open_count", { count: open.length })}
        </h3>
        {open.length === 0 ? (
          <p className="mt-2 text-micro text-fg-subtle">{t("d_no_needs")}</p>
        ) : (
          <ul className="mt-2.5 flex flex-col gap-2.5">
            {open.map((need, index) => (
              <NeedCard key={index} need={need} />
            ))}
          </ul>
        )}
      </section>

      {closed.length > 0 && (
        <section>
          <h3 className="text-[10px] font-bold tracking-[0.14em] uppercase text-fg-muted">
            {t("needs_closed_section")} ·{" "}
            {t("needs_closed_count", { count: closed.length })}
          </h3>
          <ul className="mt-2.5 flex flex-col gap-2.5">
            {closed.map((need, index) => (
              <NeedCard key={index} need={need} />
            ))}
          </ul>
        </section>
      )}

      {draft.values.needsNotes && (
        <DetailItem label={t("f_needs_notes")} full>
          {draft.values.needsNotes}
        </DetailItem>
      )}
    </div>
  );
}
