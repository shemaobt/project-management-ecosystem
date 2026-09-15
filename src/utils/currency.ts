import { CURRENCY_CODES, isCurrencyCode, type CurrencyCode } from "../constants/currencies";
import { getActiveLocale } from "../i18n";

export interface CurrencyOption {
  code: CurrencyCode;
  name: string;
}

const displayNames = new Map<string, Intl.DisplayNames>();

function namesFor(locale: string): Intl.DisplayNames {
  let names = displayNames.get(locale);
  if (!names) {
    names = new Intl.DisplayNames([locale], { type: "currency" });
    displayNames.set(locale, names);
  }
  return names;
}

export function currencyName(code: string, locale = getActiveLocale()): string {
  if (!isCurrencyCode(code)) return code;
  return namesFor(locale).of(code) ?? code;
}

export function listCurrencies(locale = getActiveLocale()): CurrencyOption[] {
  return CURRENCY_CODES.map((code) => ({ code, name: currencyName(code, locale) })).sort(
    (a, b) => a.name.localeCompare(b.name, locale),
  );
}

/**
 * `amount` formatted in `currency` — never a bare number. An amount this module cannot
 * format (a currency code `Intl` does not recognise) still carries its code as text: the
 * DoD's line is "every amount rendered with its currency", not "every amount formatted
 * prettily". Nothing here converts a value from one currency to another.
 */
export function formatMoney(
  amount: string | number,
  currency: string,
  locale = getActiveLocale(),
): string {
  const value = typeof amount === "string" ? Number(amount) : amount;
  if (!Number.isFinite(value)) return `${amount} ${currency}`;
  try {
    return new Intl.NumberFormat(locale, { style: "currency", currency }).format(value);
  } catch {
    return `${value.toFixed(2)} ${currency}`;
  }
}
