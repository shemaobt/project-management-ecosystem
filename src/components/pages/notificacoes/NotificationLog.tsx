import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { NEED_CATEGORIES } from "../../../constants/project";
import { HEALTH_LABEL_KEYS } from "../../../constants/status";
import type { AppNotification } from "../../../types/notification";
import type { NeedCategory } from "../../../types/project";
import { cn } from "../../../utils/cn";
import { formatDate } from "../../../utils/format";
import { notificationAge } from "../../../utils/notifications";
import { EmptyState } from "../../common/EmptyState";
import { LoadingSpinner } from "../../common/LoadingSpinner";

function needCategoryLabel(category: NeedCategory, t: TFunction): string {
  const found = NEED_CATEGORIES.find((candidate) => candidate.id === category);
  return found ? t(found.labelKey) : category;
}

function summaryFor(entry: AppNotification, t: TFunction): string {
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
  }
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

function LogRow({ entry }: { entry: AppNotification }) {
  const { t } = useTranslation();

  return (
    <div className="flex items-center gap-3 border-b border-line px-1 py-2.5 last:border-b-0">
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
          {entry.language} · {entry.base || "—"}
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
    </div>
  );
}

export interface NotificationLogProps {
  entries: readonly AppNotification[] | null;
  enabled: boolean;
}

export function NotificationLog({ entries, enabled }: NotificationLogProps) {
  const { t } = useTranslation();

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
        <LogRow key={entry.id} entry={entry} />
      ))}
    </div>
  );
}
