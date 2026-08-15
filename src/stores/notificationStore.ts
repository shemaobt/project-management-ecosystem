import { create } from "zustand";
import { persist } from "zustand/middleware";
import { NOTIF_DEFAULTS } from "../constants/notifications";
import type {
  NotificationPrefs,
  NotificationPrefsHandlers,
} from "../types/notification";

const NOTIFICATIONS_KEY = "shema-notifications-v1";

export const NOTIFICATIONS_VERSION = 1;

const READ_LIMIT = 200;

interface NotificationState extends NotificationPrefsHandlers {
  prefs: NotificationPrefs;
  readIds: string[];
  markRead: (ids: readonly string[]) => void;
}

type PersistedNotifications = Pick<NotificationState, "prefs" | "readIds">;

function patched(
  prefs: NotificationPrefs,
  patch: Partial<NotificationPrefs>,
): { prefs: NotificationPrefs } {
  return { prefs: { ...prefs, ...patch } };
}

export const useNotificationStore = create<NotificationState>()(
  persist<NotificationState, [], [], PersistedNotifications>(
    (set) => ({
      prefs: NOTIF_DEFAULTS,
      readIds: [],
      setEnabled: (enabled) =>
        set((state) => patched(state.prefs, { enabled })),
      toggleChannel: (channel) =>
        set((state) =>
          patched(state.prefs, {
            channels: {
              ...state.prefs.channels,
              [channel]: !state.prefs.channels[channel],
            },
          }),
        ),
      setWhen: (when) => set((state) => patched(state.prefs, { when })),
      setScope: (scope) => set((state) => patched(state.prefs, { scope })),
      setEmailAddr: (emailAddr) =>
        set((state) => patched(state.prefs, { emailAddr })),
      setPhoneAddr: (phoneAddr) =>
        set((state) => patched(state.prefs, { phoneAddr })),
      toggleCustomProject: (projectId) =>
        set((state) =>
          patched(state.prefs, {
            customProjectIds: state.prefs.customProjectIds.includes(projectId)
              ? state.prefs.customProjectIds.filter((id) => id !== projectId)
              : [...state.prefs.customProjectIds, projectId],
          }),
        ),
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
