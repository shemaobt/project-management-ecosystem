import { isCountryCode, type CountryCode } from "../constants/countries";
import type {
  ContactChannel,
  IntercessorCreate,
  IntercessorEntry,
  IntercessorUpdatePayload,
} from "../types/prayer";
import { countryName } from "./countries";

const NON_DIGITS = /\D/gu;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/u;

const MIN_PHONE_DIGITS = 8;

export function contactChannel(contact: string): ContactChannel | null {
  const value = contact.trim();
  if (EMAIL.test(value)) return "email";
  if (value.replace(NON_DIGITS, "").length >= MIN_PHONE_DIGITS) return "phone";
  return null;
}

export interface IntercessorCreateDraft {
  name: string;
  country: string;
  contact: string;
  sensitiveCountry: boolean;
  consentBasis: string;
  listInDirectory: boolean;
}

export const EMPTY_CREATE_DRAFT: IntercessorCreateDraft = {
  name: "",
  country: "",
  contact: "",
  sensitiveCountry: false,
  consentBasis: "",
  listInDirectory: false,
};

export type CreateField = "name" | "country" | "contact" | "consentBasis";

export function missingCreateFields(
  draft: IntercessorCreateDraft,
): CreateField[] {
  const missing: CreateField[] = [];
  if (!draft.name.trim()) missing.push("name");
  if (!isCountryCode(draft.country)) missing.push("country");
  if (!contactChannel(draft.contact)) missing.push("contact");
  if (!draft.consentBasis.trim()) missing.push("consentBasis");
  return missing;
}

export function makeIntercessorCreate(
  draft: IntercessorCreateDraft,
): IntercessorCreate | null {
  if (missingCreateFields(draft).length > 0) return null;
  if (!isCountryCode(draft.country)) return null;
  return {
    name: draft.name.trim(),
    country: draft.country,
    contact: draft.contact.trim(),
    sensitiveCountry: draft.sensitiveCountry,
    consentBasis: draft.consentBasis.trim(),
  };
}

/**
 * The edit draft never starts with a contact: the current one is not in the
 * directory response and must be revealed, one person at a time, before it
 * can be shown for correction (FE-44 §9.6, BE-13's `reveal_intercessor_contact`).
 */
export interface IntercessorEditDraft {
  name: string;
  country: string;
  contact: string;
  contactRevealed: boolean;
  sensitiveCountry: boolean;
}

export type EditField = "name" | "country" | "contact";

export function missingEditFields(draft: IntercessorEditDraft): EditField[] {
  const missing: EditField[] = [];
  if (!draft.name.trim()) missing.push("name");
  if (!isCountryCode(draft.country)) missing.push("country");
  if (draft.contact.trim() && !contactChannel(draft.contact)) {
    missing.push("contact");
  }
  return missing;
}

export function toEditDraft(person: IntercessorEntry): IntercessorEditDraft {
  return {
    name: person.name,
    country: person.country,
    contact: "",
    contactRevealed: false,
    sensitiveCountry: person.sensitiveCountry,
  };
}

export function makeIntercessorUpdate(
  draft: IntercessorEditDraft,
): IntercessorUpdatePayload | null {
  if (missingEditFields(draft).length > 0) return null;
  if (!isCountryCode(draft.country)) return null;
  const contact = draft.contact.trim();
  return {
    name: draft.name.trim(),
    country: draft.country,
    sensitiveCountry: draft.sensitiveCountry,
    ...(contact ? { contact } : {}),
  };
}

export function hasConsent(
  person: IntercessorEntry,
  context: "network" | "directory" | "partner-export",
): boolean {
  return person.consents.some((consent) => consent.context === context);
}

export interface CountryGroup {
  code: CountryCode;
  name: string;
  people: IntercessorEntry[];
}

export function groupByCountry(
  people: readonly IntercessorEntry[],
  locale?: string,
): CountryGroup[] {
  const groups = new Map<CountryCode, IntercessorEntry[]>();
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

export function matchesQuery(
  person: IntercessorEntry,
  query: string,
  countryLabel: string,
): boolean {
  const needle = query.trim().toLocaleLowerCase();
  if (!needle) return true;
  return (
    person.name.toLocaleLowerCase().includes(needle) ||
    countryLabel.toLocaleLowerCase().includes(needle)
  );
}
