import type { CountryCode } from "../constants/countries";
import type { RegionKey } from "./region";

export type PrayerSource = "Formulário" | "Necessidade";

export interface PrayerRequest {
  id: string;
  projectId: string;
  language: string;
  /** OBT-560: `language` is not the language's own name — the public one or the region key.
   * `getLanguageNameDisplay` reads it. */
  languageNameWithheld?: boolean;
  base: string;
  country: string;
  region: RegionKey;
  locationWithheld: boolean;
  text: string;
  audioUrl?: string;
  source: PrayerSource;
  answered: boolean;
  date: string;
}

/**
 * A sensitive project's request the team authorized and the coordination has not released
 * (OBT-575) — the review queue's row. Served to the coordination alone, so `text` is the team's
 * own and `language` the name as coordination reads it (shema-api `language_name_for`, as
 * coordination). `needId` is `null` for the project's own request.
 */
export interface PrayerReviewEntry {
  id: string;
  projectId: string;
  needId: string | null;
  language: string;
  /** OBT-560's flag, as on the wall's entry — read by `getLanguageNameDisplay`. */
  languageNameWithheld?: boolean;
  source: PrayerSource;
  text: string;
}

/**
 * The release of one waiting request. `reviewed` is the team's text as the coordinator read it —
 * the server refuses the release if the team has written another since; `text`, when sent, is
 * the coordinator's edit and is what reaches the wall and the Pulse.
 */
export interface PrayerReleasePayload {
  needId: string | null;
  reviewed: string;
  text?: string;
}

export type ContactChannel = "phone" | "email";

export type ConsentContext = "network" | "directory" | "partner-export";

export interface IntercessorConsent {
  context: ConsentContext;
  basis: string;
  recordedAt: string;
}

export interface IntercessorEntry {
  id: string;
  name: string;
  country: CountryCode;
  contactChannel: ContactChannel | null;
  contactHint: string;
  sensitiveCountry: boolean;
  addedAt: string;
  /** Last time the Resource Circle confirmed this person still belongs. `null` until then. */
  reviewedAt: string | null;
  /** Last time the network sent this person anything (BE-09 writes it). `null`: never. */
  lastSentAt: string | null;
  /**
   * More than a year since the latest of entry, review and send — computed by the server
   * (OBT-531), never here: the screen highlights, it does not count days.
   */
  reviewDue: boolean;
  consents: IntercessorConsent[];
}

export interface IntercessorDirectory {
  people: IntercessorEntry[];
  withheldCount: number;
  /** Of the people not listed, how many are past their year — a number, never a name. */
  withheldReviewDueCount: number;
}

export interface IntercessorCreate {
  name: string;
  country: CountryCode;
  contact: string;
  sensitiveCountry: boolean;
  consentBasis: string;
}

export interface IntercessorUpdatePayload {
  name?: string;
  country?: CountryCode;
  contact?: string;
  sensitiveCountry?: boolean;
}
