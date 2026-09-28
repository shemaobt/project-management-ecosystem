import type { CountryCode } from "../constants/countries";
import type { RegionKey } from "./region";

export type PrayerSource = "Formulário" | "Necessidade";

export interface PrayerRequest {
  id: string;
  projectId: string;
  language: string;
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
