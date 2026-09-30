import { AlertTriangle, HandCoins } from "lucide-react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import {
  OPEN_INSTANCE_TONE,
  REQUEST_TYPE_LABEL_KEYS,
  STAGE_LABEL_KEYS,
  STAGE_TONES,
} from "../../../../constants/requests";
import type { RequestCard } from "../../../../types/request";
import { formatMoney } from "../../../../utils/currency";
import { formatDate, utcDay } from "../../../../utils/format";
import { LoadingSpinner } from "../../../common/LoadingSpinner";
import { Badge } from "../../../ui";
import { RecordPanel } from "../RecordPanel";

function endorsementKey(card: RequestCard): string {
  if (card.endorsed) return "rr_card_endorsed";
  return card.stage === "triagem" ? "rr_card_awaiting_endorsement" : "rr_card_not_endorsed";
}

function RequestRow({ card }: { card: RequestCard }) {
  const { t } = useTranslation();
  const locale = t("locale");
  const amount =
    card.amount_requested === null
      ? t("rr_card_no_amount")
      : formatMoney(card.amount_requested, card.currency, locale);

  return (
    <li className="flex flex-col gap-1.5 rounded-[10px] border border-line bg-elevated px-3.5 py-2.5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <span className="text-[13px] font-semibold wrap-anywhere text-fg">
          {card.reg_name || t("notif_request_unnamed")}
        </span>
        {card.open ? (
          <Badge tone={OPEN_INSTANCE_TONE} uppercase>
            {t("rr_card_open")}
          </Badge>
        ) : (
          <Badge tone={STAGE_TONES[card.stage]} uppercase>
            {t(STAGE_LABEL_KEYS[card.stage])}
          </Badge>
        )}
      </div>
      <span className="text-micro text-fg-muted">
        {t(REQUEST_TYPE_LABEL_KEYS[card.request_type])} · {amount}
      </span>
      <span className="text-micro text-fg-subtle">
        {card.submitted_at
          ? [
              t("rr_card_sent_on", { date: formatDate(utcDay(card.submitted_at), locale) }),
              t(endorsementKey(card)),
            ].join(" · ")
          : t("rr_card_started_on", { date: formatDate(utcDay(card.created_at), locale) })}
      </span>
    </li>
  );
}

export interface RequestsPanelProps {
  cards: readonly RequestCard[] | null;
  error: string | null;
  action: ReactNode;
}

export function RequestsPanel({ cards, error, action }: RequestsPanelProps) {
  const { t } = useTranslation();

  return (
    <RecordPanel
      icon={<HandCoins size={14} strokeWidth={1.75} aria-hidden />}
      title={t("rr_panel_title")}
      hint={t("rr_panel_hint", { admin: t("role_admin") })}
      action={action}
    >
      {error ? (
        <p
          role="alert"
          className="mt-3 inline-flex items-center gap-1.5 text-micro font-semibold text-accent-press"
        >
          <AlertTriangle size={14} strokeWidth={1.75} aria-hidden />
          {error}
        </p>
      ) : cards === null ? (
        <div className="mt-3">
          <LoadingSpinner size="sm" label={t("loading")} />
        </div>
      ) : cards.length === 0 ? (
        <p className="mt-3 text-micro text-fg-subtle">{t("rr_panel_empty")}</p>
      ) : (
        <ul className="mt-3 flex flex-col gap-2">
          {cards.map((card) => (
            <RequestRow key={card.id} card={card} />
          ))}
        </ul>
      )}
    </RecordPanel>
  );
}
