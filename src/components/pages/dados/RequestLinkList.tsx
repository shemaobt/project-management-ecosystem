import { RotateCcw } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  REQUEST_LINK_STATUS_LABEL_KEYS,
  REQUEST_LINK_STATUS_TONES,
  REVOCABLE_LINK_STATUSES,
} from "../../../constants/requests";
import type { RequestLink } from "../../../types/request";
import { formatDate, utcDay } from "../../../utils/format";
import { LoadingSpinner } from "../../common/LoadingSpinner";
import { Badge, Button } from "../../ui";

export interface RequestLinkListProps {
  links: readonly RequestLink[] | null;
  error: string | null;
  onRevoke: (link: RequestLink) => void;
  onRetry: () => void;
}

export function RequestLinkList({ links, error, onRevoke, onRetry }: RequestLinkListProps) {
  const { t } = useTranslation();
  const locale = t("locale");

  if (error) {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-small text-fg-muted">{error}</p>
        <Button size="sm" variant="secondary" onClick={onRetry}>
          {t("net_retry")}
        </Button>
      </div>
    );
  }
  if (links === null) {
    return (
      <div className="flex justify-center py-4">
        <LoadingSpinner size="sm" label={t("loading")} />
      </div>
    );
  }
  if (links.length === 0) {
    return <p className="text-small text-fg-subtle">{t("rr_links_empty")}</p>;
  }

  return (
    <ul className="flex flex-col gap-1.5">
      {links.map((link) => (
        <li
          key={link.id}
          className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 rounded-md border border-line px-3 py-2"
        >
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="text-small font-semibold wrap-anywhere text-fg">{link.email}</span>
            {link.project_hint ? (
              <span className="text-micro wrap-anywhere text-fg-muted">{link.project_hint}</span>
            ) : null}
            <span className="text-tag text-fg-subtle">
              {t("intake_expires_on", {
                date: formatDate(utcDay(link.expires_at), locale),
              })}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Badge tone={REQUEST_LINK_STATUS_TONES[link.status]} size="sm" uppercase>
              {t(REQUEST_LINK_STATUS_LABEL_KEYS[link.status])}
            </Badge>
            {REVOCABLE_LINK_STATUSES.includes(link.status) ? (
              <Button type="button" size="sm" variant="ghost" onClick={() => onRevoke(link)}>
                <RotateCcw size={14} strokeWidth={1.75} aria-hidden />
                {t("intake_revoke")}
              </Button>
            ) : null}
          </div>
        </li>
      ))}
    </ul>
  );
}
