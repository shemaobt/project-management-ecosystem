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

export const EMPTY_REGION_TEAM: RegionTeam = {
  coordinator: "",
  obtLab: "",
  resourceCircle: "",
};
