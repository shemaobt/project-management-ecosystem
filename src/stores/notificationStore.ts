import { create } from "zustand";
import { persist } from "zustand/middleware";
import { NOTIF_DEFAULTS } from "../constants/notifications";
import type {
  NotificationPrefs,
  NotificationPrefsHandlers,
} from "../types/notification";
import { prefsHandlers } from "../utils/notifications";

const NOTIFICATIONS_KEY = "shema-notifications-v1";

export const NOTIFICATIONS_VERSION = 1;

const READ_LIMIT = 200;

interface NotificationState extends NotificationPrefsHandlers {
  prefs: NotificationPrefs;
  readIds: string[];
  markRead: (ids: readonly string[]) => void;
  setPrefs: (prefs: NotificationPrefs) => void;
}

type PersistedNotifications = Pick<NotificationState, "prefs" | "readIds">;

export const useNotificationStore = create<NotificationState>()(
  persist<NotificationState, [], [], PersistedNotifications>(
    (set) => ({
      prefs: NOTIF_DEFAULTS,
      readIds: [],
      ...prefsHandlers((change) =>
        set((state) => ({ prefs: change(state.prefs) })),
      ),
      setPrefs: (prefs) => set({ prefs }),
      markRead: (ids) =>
        set((state) => ({
          readIds: [...new Set([...state.readIds, ...ids])].slice(-READ_LIMIT),
        })),
    }),
    {
      name: NOTIFICATIONS_KEY,
      version: NOTIFICATIONS_VERSION,
      migrate: () => ({ prefs: NOTIF_DEFAULTS, readIds: [] }),
      partialize: (state) => ({ prefs: state.prefs, readIds: state.readIds }),
    },
  ),
);
