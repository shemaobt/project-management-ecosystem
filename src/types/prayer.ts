import type { RegionKey } from "./region";

export type PrayerSource = "Formulário" | "Necessidade";

export interface PrayerRequest {
  id: string;
  projectId: string;
  language: string;
  base: string;
  country: string;
  region: RegionKey;
  text: string;
  source: PrayerSource;
  answered: boolean;
  date: string;
}

export interface Intercessor {
  id: string;
  name: string;
  country: string;
  contact: string;
}
