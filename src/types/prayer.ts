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
  consents: IntercessorConsent[];
}

export interface IntercessorDirectory {
  people: IntercessorEntry[];
  withheldCount: number;
}

export interface IntercessorCreate {
  name: string;
  country: string;
  contact: string;
  sensitiveCountry: boolean;
  consentBasis: string;
}

export interface IntercessorUpdatePayload {
  name?: string;
  country?: string;
  contact?: string;
  sensitiveCountry?: boolean;
}
