import { Bell } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../contexts/AuthContext";
import { useNotificationStore } from "../../stores/notificationStore";
import { useProjectsStore } from "../../stores/projectsStore";
import { cn } from "../../utils/cn";
import { countUnread, visibleNotifications } from "../../utils/notifications";
import { getRegion } from "../../utils/region";
import { NotificationsPanel } from "../pages/notificacoes/NotificationsPanel";

export interface NotificationBellProps {
  className?: string;
}

export function NotificationBell({ className }: NotificationBellProps) {
  const { t } = useTranslation();
  const projects = useProjectsStore((state) => state.projects);
  const hydrated = useProjectsStore((state) => state.hydrated);
  const hydrate = useProjectsStore((state) => state.hydrate);
  const { user } = useAuth();
  const prefs = useNotificationStore((state) => state.prefs);
  const readIds = useNotificationStore((state) => state.readIds);
  const markRead = useNotificationStore((state) => state.markRead);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  const scope = user.regionScope;
  const scopedProjects = useMemo(
    () =>
      scope === null
        ? projects
        : projects.filter((project) => scope.includes(getRegion(project))),
    [projects, scope],
  );

  const entries = useMemo(
    () =>
      hydrated
        ? visibleNotifications(
            projects,
            { role: user.role, regions: scope },
            prefs,
            user.name,
          )
        : [],
    [hydrated, projects, user.role, user.name, scope, prefs],
  );

  const unread = countUnread(entries, readIds);

  useEffect(() => {
    if (!open || entries.length === 0) return;
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
      <NotificationsPanel
        open={open}
        onOpenChange={setOpen}
        entries={entries}
        projects={scopedProjects}
      />
    </>
  );
}
