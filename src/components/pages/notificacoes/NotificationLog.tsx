import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { Link } from "react-router-dom";
import { DEFAULT_TAB } from "../../../constants/recordTabs";
import { DECISION_STAGE_LABEL_KEYS } from "../../../constants/requests";
import { SERVED_NOTICE_TITLE_KEYS } from "../../../constants/notifications";
import { HEALTH_LABEL_KEYS } from "../../../constants/status";
import type { PanelEntry } from "../../../types/notification";
import { cn } from "../../../utils/cn";
import { formatDate } from "../../../utils/format";
import { needCategoryLabel } from "../../../utils/needs";
import { getLanguageNameDisplay } from "../../../utils/region";
import {
  isRequestNotice,
  isServedNotice,
  notificationAge,
} from "../../../utils/notifications";
import { servedNoticeSummary } from "../../../utils/servedNotices";
import { EmptyState } from "../../common/EmptyState";
import { LoadingSpinner } from "../../common/LoadingSpinner";

function summaryFor(entry: PanelEntry, t: TFunction): string {
  if (isServedNotice(entry)) return servedNoticeSummary(entry, t);
  switch (entry.kind) {
    case "field":
      return entry.fromField
        ? t("notif_field_summary_by", { name: entry.fromField })
        : t("notif_field_summary");
    case "health":
      return entry.overall === "na"
        ? t("notif_health_summary")
        : t("notif_health_summary_rated", {
            overall: t(HEALTH_LABEL_KEYS[entry.overall]),
          });
    case "need":
      return t("notif_need_summary", {
        category: needCategoryLabel(entry.category, t),
      });
    case "stale":
      return t("notif_stale_summary", { count: entry.daysSilent });
    case "prayer":
      return entry.text || t("oracao_audio");
    case "requestArrival":
      return t("notif_request_arrival_summary");
    case "requestDecision":
      return t("notif_request_decision_summary", {
        stage: t(DECISION_STAGE_LABEL_KEYS[entry.requestStage]),
      });
  }
}

/**
 * A served project notice is titled by its kind in the reader's language (INT-11), and its line
 * is worded here from the facts the server answers (OBT-559, `servedNoticeSummary`): the fields
 * the fixture title reads — language, base — still do not travel.
 */
function titleFor(entry: PanelEntry, t: TFunction): string {
  if (isServedNotice(entry)) return t(SERVED_NOTICE_TITLE_KEYS[entry.kind]);
  if (isRequestNotice(entry)) {
    return entry.requestName.trim() || t("notif_request_unnamed");
  }
  const name = getLanguageNameDisplay(
    { languageName: entry.language, languageNameWithheld: entry.languageNameWithheld },
    t,
  );
  return `${name} · ${entry.base || "—"}`;
}

function ageLabel(date: string, t: TFunction): string {
  const age = notificationAge(date);
  switch (age.unit) {
    case "today":
      return t("notif_time_today");
    case "yesterday":
      return t("notif_time_yesterday");
    case "days":
      return t("notif_time_days", { count: age.days });
    case "date":
      return formatDate(date, t("locale"));
  }
}

const ROW = "flex items-center gap-3 border-b border-line px-1 py-2.5 last:border-b-0";

interface LogRowProps {
  entry: PanelEntry;
  onNavigate?: () => void;
}

function LogRow({ entry, onNavigate }: LogRowProps) {
  const content = <RowContent entry={entry} />;
  const linked = isRequestNotice(entry) || isServedNotice(entry);
  if (linked && entry.projectId !== null) {
    return (
      <Link
        to={`/ficha/${entry.projectId}/${DEFAULT_TAB}`}
        onClick={onNavigate}
        className={cn(
          ROW,
          "rounded-sm transition-colors duration-fast ease-out hover:bg-accent-soft",
        )}
      >
        {content}
      </Link>
    );
  }
  return <div className={ROW}>{content}</div>;
}

function RowContent({ entry }: { entry: PanelEntry }) {
  const { t } = useTranslation();

  return (
    <>
      <span
        aria-hidden
        className={cn(
          "size-2 shrink-0 rounded-pill",
          entry.urgent
            ? "bg-urgent ring-4 ring-urgent-soft"
            : "bg-telha ring-4 ring-accent-soft",
        )}
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] leading-[1.2] font-semibold text-fg-strong">
          {titleFor(entry, t)}
        </p>
        <p className="mt-0.5 text-micro leading-[1.3] text-fg-muted">
          {entry.urgent && (
            <span className="font-bold text-urgent">
              {t("notif_urgent_tag")} ·{" "}
            </span>
          )}
          {summaryFor(entry, t)}
        </p>
      </div>
      <span className="shrink-0 text-micro leading-none font-medium text-fg-subtle">
        {ageLabel(entry.date, t)}
      </span>
    </>
  );
}

export interface NotificationLogProps {
  entries: readonly PanelEntry[] | null;
  /** Why the list could not be read — said instead of a spinner that never ends. */
  unreadable?: string | null;
  enabled: boolean;
  onNavigate?: () => void;
}

export function NotificationLog({
  entries,
  unreadable = null,
  enabled,
  onNavigate,
}: NotificationLogProps) {
  const { t } = useTranslation();

  if (entries === null && unreadable !== null) {
    return <EmptyState className="px-6 py-8" message={unreadable} />;
  }

  if (entries === null) {
    return (
      <div className="flex justify-center py-6">
        <LoadingSpinner label={t("loading")} />
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <EmptyState
        className="px-6 py-8"
        message={t(enabled ? "notif_empty" : "notif_empty_off")}
      />
    );
  }

  return (
    <div className="flex flex-col">
      {entries.map((entry) => (
        <LogRow key={entry.id} entry={entry} onNavigate={onNavigate} />
      ))}
    </div>
  );
}
