import { isCountryCode, type CountryCode } from "../constants/countries";
import type { ContactChannel, Intercessor } from "../types/prayer";
import { countryName } from "./countries";
import { toLocalIsoDate } from "./format";

const NON_DIGITS = /\D/gu;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/u;

const MIN_PHONE_DIGITS = 8;

export function contactChannel(contact: string): ContactChannel | null {
  const value = contact.trim();
  if (EMAIL.test(value)) return "email";
  if (value.replace(NON_DIGITS, "").length >= MIN_PHONE_DIGITS) return "phone";
  return null;
}

export interface IntercessorDraft {
  name: string;
  country: string;
  contact: string;
}

export type IntercessorField = keyof IntercessorDraft;

export function missingFields(draft: IntercessorDraft): IntercessorField[] {
  const missing: IntercessorField[] = [];
  if (!draft.name.trim()) missing.push("name");
  if (!isCountryCode(draft.country)) missing.push("country");
  if (!contactChannel(draft.contact)) missing.push("contact");
  return missing;
}

export function makeIntercessor(
  draft: IntercessorDraft,
  id: string,
  now: Date = new Date(),
): Intercessor | null {
  if (missingFields(draft).length > 0) return null;
  if (!isCountryCode(draft.country)) return null;
  return {
    id,
    name: draft.name.trim(),
    country: draft.country,
    contact: draft.contact.trim(),
    addedAt: toLocalIsoDate(now),
  };
}

export function toDraft(person: Intercessor): IntercessorDraft {
  return { name: person.name, country: person.country, contact: person.contact };
}

export interface CountryGroup {
  code: CountryCode;
  name: string;
  people: Intercessor[];
}

export function groupByCountry(
  people: readonly Intercessor[],
  locale?: string,
): CountryGroup[] {
  const groups = new Map<CountryCode, Intercessor[]>();
  for (const person of people) {
    const existing = groups.get(person.country);
    if (existing) existing.push(person);
    else groups.set(person.country, [person]);
  }
  return [...groups]
    .map(([code, members]) => ({
      code,
      name: countryName(code, locale),
      people: [...members].sort((a, b) =>
        a.name.localeCompare(b.name, locale),
      ),
    }))
    .sort((a, b) => a.name.localeCompare(b.name, locale));
}
