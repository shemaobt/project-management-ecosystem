import { COUNTRY_CODES, isCountryCode, type CountryCode } from "../constants/countries";
import { getActiveLocale } from "../i18n";

export interface CountryOption {
  code: CountryCode;
  name: string;
}

const displayNames = new Map<string, Intl.DisplayNames>();

function namesFor(locale: string): Intl.DisplayNames {
  let names = displayNames.get(locale);
  if (!names) {
    names = new Intl.DisplayNames([locale], { type: "region" });
    displayNames.set(locale, names);
  }
  return names;
}

export function countryName(
  code: string,
  locale = getActiveLocale(),
): string {
  if (!isCountryCode(code)) return code;
  return namesFor(locale).of(code) ?? code;
}

export function listCountries(locale = getActiveLocale()): CountryOption[] {
  return COUNTRY_CODES.map((code) => ({ code, name: countryName(code, locale) }))
    .sort((a, b) => a.name.localeCompare(b.name, locale));
}
