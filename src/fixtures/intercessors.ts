import type {
  ConsentContext,
  IntercessorConsent,
  IntercessorCreate,
  IntercessorDirectory,
  IntercessorEntry,
  IntercessorUpdatePayload,
} from "../types/prayer";
import { contactChannel, hasConsent } from "../utils/intercessors";
import { toLocalIsoDate } from "../utils/format";

// In memory rather than a database: enough to exercise the screen for the
// life of the page without a backend running.
const PEOPLE = new Map<string, IntercessorEntry>();
const CONTACTS = new Map<string, string>();

function hint(contact: string): string {
  const at = contact.indexOf("@");
  if (at > 1) return `${contact.slice(0, 2)}…${contact.slice(at)}`;
  const digits = contact.replace(/\D/gu, "");
  return digits.length >= 4 ? `…${digits.slice(-4)}` : "…";
}

export async function loadIntercessors(): Promise<IntercessorDirectory> {
  const all = [...PEOPLE.values()];
  const visible = all.filter((person) => hasConsent(person, "directory"));
  return {
    people: visible.map((person) => ({ ...person })),
    withheldCount: all.length - visible.length,
  };
}

export async function createIntercessor(
  payload: IntercessorCreate,
  now: Date = new Date(),
): Promise<IntercessorEntry> {
  const entry: IntercessorEntry = {
    id: crypto.randomUUID(),
    name: payload.name,
    country: payload.country,
    contactChannel: contactChannel(payload.contact),
    contactHint: hint(payload.contact),
    sensitiveCountry: payload.sensitiveCountry,
    addedAt: toLocalIsoDate(now),
    consents: [
      { context: "network", basis: payload.consentBasis, recordedAt: toLocalIsoDate(now) },
    ],
  };
  PEOPLE.set(entry.id, entry);
  CONTACTS.set(entry.id, payload.contact);
  return { ...entry };
}

export async function updateIntercessor(
  id: string,
  payload: IntercessorUpdatePayload,
): Promise<IntercessorEntry> {
  const current = PEOPLE.get(id);
  if (!current) throw new Error(`no intercessor with id '${id}'`);

  if (payload.contact) CONTACTS.set(id, payload.contact);

  const updated: IntercessorEntry = {
    ...current,
    name: payload.name ?? current.name,
    country: payload.country ?? current.country,
    sensitiveCountry: payload.sensitiveCountry ?? current.sensitiveCountry,
    contactChannel: payload.contact
      ? contactChannel(payload.contact)
      : current.contactChannel,
    contactHint: payload.contact ? hint(payload.contact) : current.contactHint,
  };
  PEOPLE.set(id, updated);
  return { ...updated };
}

export async function removeIntercessor(id: string): Promise<void> {
  if (!PEOPLE.has(id)) throw new Error(`no intercessor with id '${id}'`);
  PEOPLE.delete(id);
  CONTACTS.delete(id);
}

/** One person, one call — the fixture's answer to `reveal_intercessor_contact.py`. */
export async function revealContact(id: string): Promise<string> {
  return CONTACTS.get(id) ?? "";
}

/** Test-only: the fixture is an in-memory stand-in, and a suite needs a clean one per case. */
export function resetIntercessorNetwork(): void {
  PEOPLE.clear();
  CONTACTS.clear();
}

export async function grantConsent(
  id: string,
  context: ConsentContext,
  basis: string,
  now: Date = new Date(),
): Promise<IntercessorEntry> {
  const current = PEOPLE.get(id);
  if (!current) throw new Error(`no intercessor with id '${id}'`);

  const consent: IntercessorConsent = { context, basis, recordedAt: toLocalIsoDate(now) };
  const updated: IntercessorEntry = {
    ...current,
    consents: [...current.consents.filter((entry) => entry.context !== context), consent],
  };
  PEOPLE.set(id, updated);
  return { ...updated };
}
