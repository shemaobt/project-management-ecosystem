import { Bell } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "../../utils/cn";
import { NotificationsPanel } from "../pages/notificacoes/NotificationsPanel";
import { useNotifications } from "../pages/notificacoes/useNotifications";

export interface NotificationBellProps {
  className?: string;
}

export function NotificationBell({ className }: NotificationBellProps) {
  const { t } = useTranslation();
  const feed = useNotifications();
  const { entries, markRead, unread } = feed;
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open || entries === null || entries.length === 0) return;
    markRead(entries.map((entry) => entry.id));
  }, [open, entries, markRead]);

  return (
    <>
      <button
        type="button"
        className={cn(className, "relative")}
        title={t("notif_bell")}
        onClick={() => setOpen(true)}
      >
        <Bell size={16} strokeWidth={2} aria-hidden />
        <span className="sr-only">
          {t("notif_bell")}
          {unread > 0 ? ` · ${t("notif_unread", { count: unread })}` : ""}
        </span>
        {unread > 0 && (
          <span
            aria-hidden
            className="absolute -top-0.5 -right-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-pill bg-telha px-1 text-[10px] font-bold text-on-brand"
          >
            {unread}
          </span>
        )}
      </button>
      <NotificationsPanel open={open} onOpenChange={setOpen} feed={feed} />
    </>
  );
}
