import { create } from "zustand";
import { persist } from "zustand/middleware";
import { DEFAULT_SORT, type SortKey } from "../constants/sorting";

export type CardMetaphor = "atlas" | "diario" | "coral";
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

export const usePrefsStore = create<PrefsState>()(
  persist(
    (set) => ({
      metaphor: "atlas",
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
      partialize: (state) => ({
        metaphor: state.metaphor,
        sort: state.sort,
        lang: state.lang,
      }),
    },
  ),
);
