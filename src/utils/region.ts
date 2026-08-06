import { COUNTRY_REGION, FALLBACK_REGION } from "../constants/regions";
import type { Project } from "../types/project";
import type { RegionKey } from "../types/region";

export function getCountry(project: Project): string {
  return project.location.split(",")[0].trim();
}

export function getRegion(project: Project): RegionKey {
  return COUNTRY_REGION[getCountry(project)] ?? FALLBACK_REGION;
}
