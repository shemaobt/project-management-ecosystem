import type { RegionDefinition, RegionKey, RegionTeam } from "../types/region";

export const REGIONS: readonly RegionDefinition[] = [
  { key: "south-america", labelKey: "continent_south_america" },
  { key: "north-america", labelKey: "continent_north_america" },
  { key: "africa", labelKey: "continent_africa" },
  { key: "asia", labelKey: "continent_asia" },
  { key: "oceania", labelKey: "continent_oceania" },
  { key: "europe", labelKey: "continent_europe" },
  { key: "other", labelKey: "continent_other" },
];

export const FALLBACK_REGION: RegionKey = "other";

export const COUNTRY_REGION: Readonly<Record<string, RegionKey>> = {
  Brazil: "south-america",
  Peru: "south-america",
  Colombia: "south-america",
  Mexico: "north-america",
  Panama: "north-america",
  "United States": "north-america",
  Canada: "north-america",
  Egypt: "africa",
  Mozambique: "africa",
  "South Africa": "africa",
  "South Sudan": "africa",
  Sudan: "africa",
  "Guinea-Bissau": "africa",
  "São Tomé e Príncipe": "africa",
  Togo: "africa",
  Uganda: "africa",
  India: "asia",
  China: "asia",
  Indonesia: "asia",
  "East Timor": "asia",
  Nepal: "asia",
  Australia: "oceania",
  "Papua New Guinea": "oceania",
  Fiji: "oceania",
  Micronesia: "oceania",
};

/**
 * The same 25 countries as Portuguese, Spanish and English write them, each spelling pointing
 * at the export's — never at a region, so a synonym cannot add a country or move one (OBT-591).
 * A project the mesa's approval files carries the place the team typed in the form.
 *
 * **Listed, not normalised.** A spelling is recognised because it is written here, exactly —
 * accents, case and spacing as listed — and nothing is title-cased, transliterated or looked
 * up. Where a language has two standard forms both are listed: Spanish as the RAE and the UN
 * write it, English with and without the diacritics the UN drops. Anything else is `other`,
 * which the Admin sees before confirming (`PendingProjectForm`). A spelling equal to the
 * export's needs no entry.
 *
 * shema-api's `COUNTRY_SYNONYMS` (`app/utils/shema_derivations.py`), spelling for spelling:
 * `countryRegion.test.ts` holds both tables against `countryRegion.json`, which the server
 * vendors byte for byte.
 */
export const COUNTRY_SYNONYMS: Readonly<Record<string, string>> = {
  Brasil: "Brazil",
  Perú: "Peru",
  Colômbia: "Colombia",
  México: "Mexico",
  Panamá: "Panama",
  "Estados Unidos": "United States",
  Canadá: "Canada",
  Egito: "Egypt",
  Egipto: "Egypt",
  Moçambique: "Mozambique",
  "África do Sul": "South Africa",
  Sudáfrica: "South Africa",
  "Sudão do Sul": "South Sudan",
  "Sudán del Sur": "South Sudan",
  Sudão: "Sudan",
  Sudán: "Sudan",
  "Guiné-Bissau": "Guinea-Bissau",
  "Guinea-Bisáu": "Guinea-Bissau",
  "Santo Tomé y Príncipe": "São Tomé e Príncipe",
  "São Tomé and Príncipe": "São Tomé e Príncipe",
  "Sao Tome and Principe": "São Tomé e Príncipe",
  Índia: "India",
  Indonésia: "Indonesia",
  "Timor-Leste": "East Timor",
  "Timor Oriental": "East Timor",
  Austrália: "Australia",
  "Papua-Nova Guiné": "Papua New Guinea",
  "Papúa Nueva Guinea": "Papua New Guinea",
  "Papua Nueva Guinea": "Papua New Guinea",
  Fiyi: "Fiji",
  Micronésia: "Micronesia",
};

export const EMPTY_REGION_TEAM: RegionTeam = {
  coordinator: "",
  obtLab: "",
  resourceCircle: "",
};
