import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ViewState } from "../utils/filterSerialisation";

export interface SavedView {
  id: string;
  name: string;
  createdAt: string;
  state: ViewState;
}

export const MAX_VIEWS_PER_USER = 12;
export const MAX_VIEW_NAME = 40;

const SAVED_VIEWS_KEY = "shema-saved-views-v1";

export function normaliseViewName(name: string): string {
  return name.trim().replace(/\s+/gu, " ").slice(0, MAX_VIEW_NAME);
}

interface SavedViewsState {
  byUser: Record<string, SavedView[]>;
  saveView: (userId: string, name: string, state: ViewState) => SavedView | null;
  renameView: (userId: string, id: string, name: string) => void;
  removeView: (userId: string, id: string) => void;
}

export const useSavedViewsStore = create<SavedViewsState>()(
  persist(
    (set, get) => ({
      byUser: {},
      saveView: (userId, name, state) => {
        const trimmed = normaliseViewName(name);
        if (!trimmed) return null;
        const existing = get().byUser[userId] ?? [];
        if (existing.length >= MAX_VIEWS_PER_USER) return null;
        const view: SavedView = {
          id: `${Date.now()}-${existing.length}`,
          name: trimmed,
          createdAt: new Date().toISOString(),
          state,
        };
        set((current) => ({
          byUser: {
            ...current.byUser,
            [userId]: [view, ...(current.byUser[userId] ?? [])],
          },
        }));
        return view;
      },
      renameView: (userId, id, name) => {
        const trimmed = normaliseViewName(name);
        if (!trimmed) return;
        set((current) => ({
          byUser: {
            ...current.byUser,
            [userId]: (current.byUser[userId] ?? []).map((view) =>
              view.id === id ? { ...view, name: trimmed } : view,
            ),
          },
        }));
      },
      removeView: (userId, id) =>
        set((current) => ({
          byUser: {
            ...current.byUser,
            [userId]: (current.byUser[userId] ?? []).filter(
              (view) => view.id !== id,
            ),
          },
        })),
    }),
    {
      name: SAVED_VIEWS_KEY,
      partialize: (state) => ({ byUser: state.byUser }),
    },
  ),
);

export function selectUserViews(
  byUser: Record<string, SavedView[]>,
  userId: string,
): readonly SavedView[] {
  return byUser[userId] ?? [];
}
