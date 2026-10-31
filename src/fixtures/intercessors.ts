import type {
  ConsentContext,
  DirectoryConsentByContact,
  IntercessorConsent,
  IntercessorCreate,
  IntercessorDirectory,
  IntercessorEntry,
  IntercessorUpdatePayload,
} from "../types/prayer";
import { failure } from "../services/api/errors";
import { contactChannel, contactKey, hasConsent } from "../utils/intercessors";
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
  const withheld = all.filter((person) => !hasConsent(person, "directory"));
  return {
    people: visible.map((person) => ({ ...person })),
    withheldCount: withheld.length,
    withheldReviewDueCount: withheld.filter((person) => person.reviewDue).length,
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
    reviewedAt: null,
    lastSentAt: null,
    // The server's to compute; a contact entered today is never due.
    reviewDue: false,
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

/**
 * `directory` by contact — the fixture's answer to `admit_to_directory.py`: the one person the
 * contact reaches (`contactKey`), listed now, or answered as already listed; nobody and two are
 * the server's two refusals. Every fixture person holds `network`, so all of them are members.
 */
export async function grantDirectoryByContact(
  payload: DirectoryConsentByContact,
  now: Date = new Date(),
): Promise<{ entry: IntercessorEntry; recorded: boolean }> {
  const key = contactKey(payload.contact);
  const found = [...CONTACTS].filter(([, contact]) => key !== null && contactKey(contact) === key);
  if (found.length === 0) {
    throw failure("notFound", "Nobody in the network is reached at this contact.");
  }
  if (found.length > 1) {
    throw failure("conflict", "More than one person in the network is reached at this contact.");
  }
  const [[id]] = found;
  const current = PEOPLE.get(id);
  if (!current) throw failure("notFound", "Nobody in the network is reached at this contact.");
  if (hasConsent(current, "directory")) return { entry: { ...current }, recorded: false };
  return { entry: await grantConsent(id, "directory", payload.basis, now), recorded: true };
}

/** "Revisado" — the fixture's answer to `review_intercessor.py`: stamp today, clear the flag. */
export async function reviewIntercessor(
  id: string,
  now: Date = new Date(),
): Promise<IntercessorEntry> {
  const current = PEOPLE.get(id);
  if (!current) throw new Error(`no intercessor with id '${id}'`);

  const updated: IntercessorEntry = {
    ...current,
    reviewedAt: toLocalIsoDate(now),
    reviewDue: false,
  };
  PEOPLE.set(id, updated);
  return { ...updated };
}

/**
 * The exit link is minted by the server for each send (BE-09), and the fixture sends
 * nothing — so no token it could be asked about was ever issued, and every one reads as
 * the server's one answer to a link that opens nothing.
 */
export async function openExitLink(token: string): Promise<void> {
  void token;
  throw failure("notFound", "This link is no longer active.");
}

export async function leaveThroughExitLink(token: string): Promise<void> {
  void token;
  throw failure("notFound", "This link is no longer active.");
}
