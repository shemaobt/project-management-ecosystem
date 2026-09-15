/**
 * ISO-4217 codes this console offers when a need's amount needs its currency.
 *
 * Grounded the way `COUNTRY_REGION` is (`src/constants/regions.ts`): the national
 * currency of each of the 25 countries the seven regions map to
 * (`src/constants/regions.ts`), deduplicated, plus USD/EUR/GBP as the cross-border
 * currencies a donor is likely to give in. Not exhaustive of ISO-4217 — a list that
 * offered all 180-odd codes would make the one a person actually needs harder to find,
 * and BE-08 refuses nothing here: a currency this list does not carry is still typed
 * correctly by hand, and the server's own ISO-4217 check is what actually enforces the
 * shape.
 */
export const CURRENCY_CODES = [
  "AUD", "BRL", "CAD", "CNY", "COP", "EGP", "EUR", "FJD", "GBP", "IDR",
  "INR", "MXN", "MZN", "NPR", "PEN", "PGK", "SDG", "SSP", "STN", "UGX",
  "USD", "XOF", "ZAR",
] as const;

export type CurrencyCode = (typeof CURRENCY_CODES)[number];

const CODES = new Set<string>(CURRENCY_CODES);

export function isCurrencyCode(value: string): value is CurrencyCode {
  return CODES.has(value);
}
