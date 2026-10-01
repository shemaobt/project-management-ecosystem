import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { failureMessage } from "../../../services/api";
import { useProjectsStore } from "../../../stores/projectsStore";
import type {
  NotificationPrefs,
  NotificationPrefsHandlers,
  PanelEntry,
} from "../../../types/notification";
import type { Project } from "../../../types/project";
import type { ApiFailure } from "../../../types/session";
import { prefsHandlers } from "../../../utils/notifications";
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
import type { NotificationsFeed } from "./useNotifications";

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
  entries: readonly PanelEntry[] | null;
  /** The sentence for a list that could not be read, in place of the spinner. */
  unreadable?: string | null;
  /** Why the saved preferences are not what is shown, when they could not be read. */
  prefsUnread?: string | null;
  onRetryPrefs?: () => void;
  projects: readonly Project[];
  prefs: NotificationPrefs;
  handlers: NotificationPrefsHandlers;
  onNavigate?: () => void;
}

export function NotificationsPanelBody({
  entries,
  unreadable = null,
  prefsUnread = null,
  onRetryPrefs,
  projects,
  prefs,
  handlers,
  onNavigate,
}: NotificationsPanelBodyProps) {
  const { t } = useTranslation();

  return (
    <DialogBody className="pt-6">
      {prefsUnread !== null && (
        <div
          role="alert"
          className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-md border-l-4 border-status-attention bg-status-attention-bg px-4 py-3 text-small leading-[1.45] text-status-attention-ink"
        >
          <p>{prefsUnread}</p>
          {onRetryPrefs && (
            <Button variant="secondary" size="sm" onClick={onRetryPrefs}>
              {t("net_retry")}
            </Button>
          )}
        </div>
      )}
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
      <NotificationLog
        entries={entries}
        unreadable={unreadable}
        enabled={prefs.enabled}
        onNavigate={onNavigate}
      />
    </DialogBody>
  );
}

export interface NotificationsPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  feed: NotificationsFeed;
}

/**
 * The preferences are a draft until *Salvar* (INT-11 · OBT-416): against the server a save is a
 * request that can fail, so a toggle that took effect on click would claim a choice the server
 * never kept. Closing without saving discards the draft; a refused save says why and keeps it.
 */
export function NotificationsPanel({
  open,
  onOpenChange,
  feed,
}: NotificationsPanelProps) {
  const { t } = useTranslation();
  const hydrateProjects = useProjectsStore((state) => state.hydrate);
  const [draft, setDraft] = useState<NotificationPrefs | null>(null);
  const [saving, setSaving] = useState(false);
  const [refusal, setRefusal] = useState<ApiFailure | null>(null);
  const saved = feed.prefs;
  const handlers = useMemo(
    () => prefsHandlers((change) => setDraft((before) => change(before ?? saved))),
    [saved],
  );

  // The scope picker lists the reader's projects; the list is read when the panel opens, not
  // when the bell mounts on every page (OBT-557).
  useEffect(() => {
    if (open) void hydrateProjects();
  }, [open, hydrateProjects]);

  const close = (next: boolean) => {
    if (!next) {
      setDraft(null);
      setRefusal(null);
    }
    onOpenChange(next);
  };

  const save = async () => {
    if (draft === null) {
      close(false);
      return;
    }
    setSaving(true);
    const failure = await feed.savePrefs(draft);
    setSaving(false);
    if (failure === null) close(false);
    else setRefusal(failure);
  };

  return (
    <Dialog open={open} onOpenChange={close}>
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
          entries={feed.entries}
          prefsUnread={
            feed.prefsFailure === null
              ? null
              : `${t("notif_prefs_unread")} ${failureMessage(feed.prefsFailure, t)}`
          }
          onRetryPrefs={feed.retryPrefs}
          unreadable={feed.failure === null ? null : failureMessage(feed.failure, t)}
          projects={feed.projects}
          prefs={draft ?? saved}
          handlers={handlers}
          onNavigate={() => close(false)}
        />
        <DialogFooter>
          <span
            role={refusal === null ? undefined : "alert"}
            className="flex-1 text-micro leading-[1.3] text-fg-muted"
          >
            {refusal === null ? t("notif_foot") : failureMessage(refusal, t)}
          </span>
          <Button
            size="sm"
            disabled={saving || !feed.prefsReady}
            onClick={() => void save()}
          >
            <span aria-hidden>✓</span>{" "}
            {t(saving ? "notif_saving" : "notif_save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
