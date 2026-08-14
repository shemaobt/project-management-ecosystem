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

export interface Intercessor {
  id: string;
  name: string;
  country: CountryCode;
  contact: string;
  addedAt: string;
}
