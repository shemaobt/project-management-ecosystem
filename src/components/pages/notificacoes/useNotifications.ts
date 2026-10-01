import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { NOTIF_DEFAULTS } from "../../../constants/notifications";
import { useAuth } from "../../../contexts/AuthContext";
import {
  notificationsAPI,
  toApiFailure,
  type NotificationsAPI,
  type ServedPanel,
} from "../../../services/api";
import { useNotificationStore } from "../../../stores/notificationStore";
import { useProjectsStore } from "../../../stores/projectsStore";
import type { NotificationPrefs, PanelEntry } from "../../../types/notification";
import type { Project } from "../../../types/project";
import type { ApiFailure } from "../../../types/session";
import {
  countUnread,
  routedNotifications,
  visibleNotifications,
} from "../../../utils/notifications";
import { getRegion } from "../../../utils/region";

/** What the bell and its panel read — the same shape whichever side answers it. */
export interface NotificationsFeed {
  /** `null` until the first list arrives. */
  entries: readonly PanelEntry[] | null;
  /** Why the list could not be read, while no list was ever read. */
  failure: ApiFailure | null;
  unread: number;
  markRead: (ids: readonly string[]) => void;
  prefs: NotificationPrefs;
  /** `false` while the saved preferences are still on their way — saving then would overwrite them. */
  prefsReady: boolean;
  savePrefs: (prefs: NotificationPrefs) => Promise<ApiFailure | null>;
  /** The projects the scope picker lists and *só os que mentoro* asks for a mentor. */
  projects: readonly Project[];
}

/**
 * Five minutes between reads, and none while the tab is hidden (INT-11 · OBT-416). A field
 * connection is often metered and a notice is not a chat message: what matters is that the bell
 * is right when someone looks, which the read on return below covers.
 */
export const NOTIFICATION_POLL_MS = 5 * 60_000;

/** Coming back to the tab reads again only if the last read is older than this. */
export const NOTIFICATION_STALE_MS = 60_000;

export function readsOnReturn(lastRead: number | null, now: number): boolean {
  return lastRead === null || now - lastRead > NOTIFICATION_STALE_MS;
}

function useScopedProjects(): { projects: readonly Project[]; hydrated: boolean } {
  const projects = useProjectsStore((state) => state.projects);
  const hydrated = useProjectsStore((state) => state.hydrated);
  const hydrate = useProjectsStore((state) => state.hydrate);
  const { user } = useAuth();
  const scope = user.regionScope;

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  const scoped = useMemo(
    () =>
      scope === null
        ? projects
        : projects.filter((project) => scope.includes(getRegion(project))),
    [projects, scope],
  );
  return { projects: scoped, hydrated };
}

/**
 * Fixture mode: derived from the projects on every render, prefs and read state in this
 * browser (§5.9's wave-1 shape, moved here unchanged from the bell).
 */
function useDerivedFeed(): NotificationsFeed {
  const { user } = useAuth();
  const all = useProjectsStore((state) => state.projects);
  const { projects, hydrated } = useScopedProjects();
  const prefs = useNotificationStore((state) => state.prefs);
  const readIds = useNotificationStore((state) => state.readIds);
  const markRead = useNotificationStore((state) => state.markRead);
  const setPrefs = useNotificationStore((state) => state.setPrefs);
  const scope = user.regionScope;

  const routed = useMemo(
    () =>
      hydrated
        ? routedNotifications(all, { roles: user.roles, regions: scope })
        : null,
    [hydrated, all, user.roles, scope],
  );
  const entries = useMemo(
    () =>
      routed === null ? null : visibleNotifications(routed, prefs, user.name),
    [routed, prefs, user.name],
  );
  const savePrefs = useCallback(
    async (next: NotificationPrefs) => {
      setPrefs(next);
      return null;
    },
    [setPrefs],
  );

  return {
    entries,
    failure: null,
    unread: entries === null ? 0 : countUnread(entries, readIds),
    markRead,
    prefs,
    prefsReady: true,
    savePrefs,
    projects,
  };
}

/**
 * Against the server (INT-11 · OBT-416, BE-15). The list, the read mark and the preferences are
 * the server's, so a notice read on the laptop is read on the phone and a stream muted once
 * stays muted on every device. Routing already happened on the server; only the prefs are
 * applied here, over the list it answered.
 */
function useServedFeed(api: NotificationsAPI): NotificationsFeed {
  const { user } = useAuth();
  const { projects } = useScopedProjects();
  const [panel, setPanel] = useState<ServedPanel | null>(null);
  const [failure, setFailure] = useState<ApiFailure | null>(null);
  const [seen, setSeen] = useState<ReadonlySet<string>>(new Set());
  const [prefs, setPrefs] = useState<NotificationPrefs | null>(null);

  useEffect(() => {
    let current = true;
    let lastRead: number | null = null;

    const read = () => {
      if (document.visibilityState === "hidden") return;
      api.list().then(
        (served) => {
          if (!current) return;
          lastRead = Date.now();
          setPanel(served);
          setFailure(null);
        },
        (raw: unknown) => {
          // A failed poll keeps the list it already shows: the next poll is the retry.
          if (current) setFailure(toApiFailure(raw));
        },
      );
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible" && readsOnReturn(lastRead, Date.now())) {
        read();
      }
    };

    read();
    const timer = window.setInterval(read, NOTIFICATION_POLL_MS);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      current = false;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [api]);

  useEffect(() => {
    let current = true;
    api.prefs().then(
      (saved) => {
        if (current) setPrefs(saved);
      },
      () => {
        // Unread preferences stay unready, so a save cannot overwrite what was never read.
      },
    );
    return () => {
      current = false;
    };
  }, [api]);

  const shownPrefs = prefs ?? NOTIF_DEFAULTS;
  const entries = useMemo(
    () =>
      panel === null
        ? null
        : visibleNotifications(panel.entries, shownPrefs, user.name, projects),
    [panel, shownPrefs, user.name, projects],
  );
  const read = useMemo(
    () => new Set([...(panel?.readIds ?? []), ...seen]),
    [panel, seen],
  );
  const readRef = useRef(read);
  useEffect(() => {
    readRef.current = read;
  }, [read]);

  const markRead = useCallback(
    (ids: readonly string[]) => {
      const fresh = ids.filter((id) => !readRef.current.has(id));
      if (fresh.length === 0) return;
      setSeen((before) => new Set([...before, ...fresh]));
      // Marked here at once; a failed mark is corrected by the next poll, which says what the
      // server actually holds.
      void api.markRead(fresh).catch(() => undefined);
    },
    [api],
  );

  const savePrefs = useCallback(
    async (next: NotificationPrefs) => {
      try {
        setPrefs(await api.savePrefs(next));
        return null;
      } catch (raw: unknown) {
        return toApiFailure(raw);
      }
    },
    [api],
  );

  return {
    entries,
    failure: panel === null ? failure : null,
    unread: entries === null ? 0 : entries.filter((entry) => !read.has(entry.id)).length,
    markRead,
    prefs: shownPrefs,
    prefsReady: prefs !== null,
    savePrefs,
    projects,
  };
}

function liveFeedOf(api: NotificationsAPI): () => NotificationsFeed {
  return function useLiveFeed() {
    return useServedFeed(api);
  };
}

/**
 * The bell's one source (INT-11 · OBT-416): the server when the build talks to one, the
 * fixture derivation otherwise. Chosen once, at load — the same hooks run on every render.
 */
export const useNotifications: () => NotificationsFeed =
  notificationsAPI === null ? useDerivedFeed : liveFeedOf(notificationsAPI);
