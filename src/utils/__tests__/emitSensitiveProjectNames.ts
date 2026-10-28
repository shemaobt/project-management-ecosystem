import { createInstance } from "i18next";
import { REGIONS } from "../../constants/regions";
import en from "../../i18n/locales/en.json";
import ptBR from "../../i18n/locales/pt-BR.json";
import type { PulseLanguage } from "../../services/api/endpoints";
import { getLanguageNameDisplay } from "../region";

/**
 * O nome que a tela imprime no lugar da chave da região (OBT-560), região por região, nas duas
 * línguas do console — escrito pela própria `getLanguageNameDisplay` sobre os catálogos, nunca à mão.
 * É a emissão que o `shema-api` vendoriza byte a byte e lê para ordenar a linha retida sem nome
 * público pelo nome impresso (OBT-657); `sensitiveProjectNames.test.ts` falha quando o arquivo e
 * os catálogos divergem, e `npm run emit:sensitive-names` reescreve o arquivo.
 *
 * As línguas vão na grafia do fio (`PulseLanguage`), que é a que o servidor recebe no cabeçalho.
 */
const CATALOGS: Record<PulseLanguage, Record<string, string>> = {
  en,
  "pt-BR": ptBR,
};

function printerFor(language: PulseLanguage) {
  const i18n = createInstance();
  void i18n.init({
    resources: { [language]: { translation: CATALOGS[language] } },
    lng: language,
    initAsync: false,
    keySeparator: false,
    nsSeparator: false,
    interpolation: { escapeValue: false },
    showSupportNotice: false,
  });
  return (key: string, options?: Record<string, string>) => String(i18n.t(key, options));
}

export function emitSensitiveProjectNames(): string {
  const emission: Record<string, Record<string, string>> = {};
  for (const language of Object.keys(CATALOGS).sort() as PulseLanguage[]) {
    const t = printerFor(language);
    emission[language] = Object.fromEntries(
      REGIONS.map((region) => [
        region.key,
        getLanguageNameDisplay({ languageName: region.key, languageNameWithheld: true }, t),
      ]),
    );
  }
  return `${JSON.stringify(emission, null, 2)}\n`;
}
