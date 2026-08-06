import { create } from "zustand";
import { persist } from "zustand/middleware";

export type CardMetaphor = "atlas" | "diario" | "coral";
export type AppLang = "pt" | "en";

const PREFS_KEY = "shema-prefs-v1";

interface PrefsState {
  metaphor: CardMetaphor;
  lang: AppLang;
  setMetaphor: (metaphor: CardMetaphor) => void;
  setLang: (lang: AppLang) => void;
  toggleLang: () => void;
}

export const usePrefsStore = create<PrefsState>()(
  persist(
    (set) => ({
      metaphor: "atlas",
      lang: "pt",
      setMetaphor: (metaphor) => set({ metaphor }),
      setLang: (lang) => set({ lang }),
      toggleLang: () =>
        set((state) => ({ lang: state.lang === "pt" ? "en" : "pt" })),
    }),
    {
      name: PREFS_KEY,
      partialize: (state) => ({ metaphor: state.metaphor, lang: state.lang }),
    },
  ),
);
