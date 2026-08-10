import { COUNTRY_REGION, FALLBACK_REGION, REGIONS } from "../constants/regions";
import type { Project } from "../types/project";
import type { RegionKey } from "../types/region";

export function getCountry(project: Project): string {
  return project.location.split(",")[0].trim();
}

export function getRegion(project: Project): RegionKey {
  return COUNTRY_REGION[getCountry(project)] ?? FALLBACK_REGION;
}

export function getRegionLabelKey(region: RegionKey): string {
  return (
    REGIONS.find((definition) => definition.key === region)?.labelKey ??
    "continent_other"
  );
}

export type LocationDisplay =
  | { withheld: false; location: string }
  | { withheld: true; regionLabelKey: string };

export function getLocationDisplay(project: Project): LocationDisplay {
  if (project.sensitiveCountry) {
    return {
      withheld: true,
      regionLabelKey: getRegionLabelKey(getRegion(project)),
    };
  }
  return { withheld: false, location: project.location };
}
