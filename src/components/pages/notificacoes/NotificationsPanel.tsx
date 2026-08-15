import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { useNotificationStore } from "../../../stores/notificationStore";
import type {
  AppNotification,
  NotificationPrefs,
  NotificationPrefsHandlers,
} from "../../../types/notification";
import type { Project } from "../../../types/project";
import {
  Button,
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../ui";
import { NotificationLog } from "./NotificationLog";
import {
  ChannelsSection,
  MasterSwitch,
  PreviewCard,
  ScopeSection,
  WhenSection,
} from "./PrefsSections";

function SectionLabel({
  number,
  children,
}: {
  number: string;
  children: ReactNode;
}) {
  return (
    <h3 className="mt-5.5 mb-3 flex items-baseline gap-2 text-[11px] leading-none font-bold tracking-eyebrow text-fg-subtle uppercase">
      <span className="text-telha">{number}</span>
      {children}
    </h3>
  );
}

export interface NotificationsPanelBodyProps {
  entries: readonly AppNotification[] | null;
  projects: readonly Project[];
  prefs: NotificationPrefs;
  handlers: NotificationPrefsHandlers;
}

export function NotificationsPanelBody({
  entries,
  projects,
  prefs,
  handlers,
}: NotificationsPanelBodyProps) {
  const { t } = useTranslation();

  return (
    <DialogBody className="pt-6">
      <MasterSwitch prefs={prefs} handlers={handlers} />
      <SectionLabel number="01">{t("notif_sec_channels")}</SectionLabel>
      <ChannelsSection prefs={prefs} handlers={handlers} />
      <SectionLabel number="02">{t("notif_sec_when")}</SectionLabel>
      <WhenSection prefs={prefs} handlers={handlers} />
      <SectionLabel number="03">{t("notif_sec_scope")}</SectionLabel>
      <ScopeSection prefs={prefs} handlers={handlers} projects={projects} />
      <SectionLabel number="04">{t("notif_sec_preview")}</SectionLabel>
      <PreviewCard />
      <SectionLabel number="05">{t("notif_sec_log")}</SectionLabel>
      <NotificationLog entries={entries} enabled={prefs.enabled} />
    </DialogBody>
  );
}

export interface NotificationsPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entries: readonly AppNotification[] | null;
  projects: readonly Project[];
}

export function NotificationsPanel({
  open,
  onOpenChange,
  entries,
  projects,
}: NotificationsPanelProps) {
  const { t } = useTranslation();
  const store = useNotificationStore();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="narrow" closeLabel={t("btn_close")}>
        <DialogHeader>
          <div className="min-w-0">
            <p className="mb-2 text-[10px] font-semibold tracking-[0.18em] uppercase text-areia">
              {t("notif_eyebrow")}
            </p>
            <DialogTitle>{t("notif_title")}</DialogTitle>
            <DialogDescription className="mt-1.5">
              {t("notif_sub")}
            </DialogDescription>
          </div>
        </DialogHeader>
        <NotificationsPanelBody
          entries={entries}
          projects={projects}
          prefs={store.prefs}
          handlers={store}
        />
        <DialogFooter>
          <span className="flex-1 text-micro leading-[1.3] text-fg-muted">
            {t("notif_foot")}
          </span>
          <Button size="sm" onClick={() => onOpenChange(false)}>
            <span aria-hidden>✓</span> {t("notif_save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
