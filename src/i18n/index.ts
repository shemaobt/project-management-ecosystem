import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { usePrefsStore } from "../stores/prefsStore";
import en from "./locales/en.json";
import ptBR from "./locales/pt-BR.json";

export const resources = {
  pt: { translation: ptBR },
  en: { translation: en },
} as const;

void i18n.use(initReactI18next).init({
  resources,
  lng: usePrefsStore.getState().lang,
  fallbackLng: "pt",
  keySeparator: false,
  nsSeparator: false,
  interpolation: { escapeValue: false },
});

i18n.on("languageChanged", () => {
  if (typeof document !== "undefined") {
    document.documentElement.lang = i18n.t("locale");
  }
});

usePrefsStore.subscribe((state) => {
  if (state.lang !== i18n.language) {
    void i18n.changeLanguage(state.lang);
  }
});

export function getActiveLocale(): string {
  return i18n.t("locale");
}

export default i18n;
