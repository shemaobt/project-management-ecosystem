import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  DEFAULT_METAPHOR,
  normaliseMetaphor,
  type CardMetaphor,
} from "../constants/metaphors";
import { DEFAULT_SORT, type SortKey } from "../constants/sorting";

export type AppLang = "pt" | "en";

const PREFS_KEY = "shema-prefs-v1";

interface PrefsState {
  metaphor: CardMetaphor;
  sort: SortKey;
  lang: AppLang;
  setMetaphor: (metaphor: CardMetaphor) => void;
  setSort: (sort: SortKey) => void;
  setLang: (lang: AppLang) => void;
  toggleLang: () => void;
}

type PersistedPrefs = Pick<PrefsState, "metaphor" | "sort" | "lang">;

export const usePrefsStore = create<PrefsState>()(
  persist<PrefsState, [], [], PersistedPrefs>(
    (set) => ({
      metaphor: DEFAULT_METAPHOR,
      sort: DEFAULT_SORT,
      lang: "pt",
      setMetaphor: (metaphor) => set({ metaphor }),
      setSort: (sort) => set({ sort }),
      setLang: (lang) => set({ lang }),
      toggleLang: () =>
        set((state) => ({ lang: state.lang === "pt" ? "en" : "pt" })),
    }),
    {
      name: PREFS_KEY,
      version: 1,
      migrate: (persisted) => {
        const stored = persisted as Partial<PersistedPrefs>;
        return {
          metaphor: normaliseMetaphor(stored.metaphor ?? null),
          sort: stored.sort ?? DEFAULT_SORT,
          lang: stored.lang ?? "pt",
        };
      },
      partialize: (state) => ({
        metaphor: state.metaphor,
        sort: state.sort,
        lang: state.lang,
      }),
    },
  ),
);
