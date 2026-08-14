import { DEFAULT_PRAYER_VISIBILITY } from "../constants/prayer";
import { REGIONS } from "../constants/regions";
import type { PrayerRequest } from "../types/prayer";
import type { PrayerVisibility, Project } from "../types/project";
import type { RegionKey } from "../types/region";
import {
  getCountry,
  getLocationDisplay,
  getRegion,
  getRegionLabelKey,
} from "./region";

export function getPrayerVisibility(
  project: Pick<Project, "prayerVisibility">,
): PrayerVisibility {
  return project.prayerVisibility ?? DEFAULT_PRAYER_VISIBILITY;
}

export function reachesPrayerWall(
  project: Pick<Project, "prayerVisibility">,
): boolean {
  return getPrayerVisibility(project) === "rede";
}

export function buildPrayerRequests(
  projects: readonly Project[],
): PrayerRequest[] {
  const requests: PrayerRequest[] = [];

  projects.forEach((project) => {
    const location = getLocationDisplay(project);
    const shared = {
      projectId: project.id,
      language: project.languageName || "—",
      base: project.team || project.ywamBase,
      country: location.withheld ? "" : getCountry(project),
      region: getRegion(project),
      locationWithheld: location.withheld,
      date: project.healthAssessmentDate || project.lastUpdated,
    };

    const text = project.prayerRequests.trim();
    const audioUrl = project.prayerRequestsAudio;
    if ((text || audioUrl) && reachesPrayerWall(project)) {
      requests.push({
        ...shared,
        id: `${project.id}-pr`,
        text,
        ...(audioUrl ? { audioUrl } : {}),
        source: "Formulário",
        answered: false,
      });
    }

    project.needsItems.forEach((need, index) => {
      if (!need.prayerShared || !need.description) return;
      requests.push({
        ...shared,
        id: `${project.id}-need${index}`,
        text: need.description.trim(),
        source: "Necessidade",
        answered: Boolean(need.prayerAnswered),
      });
    });
  });

  return requests.sort((a, b) => b.date.localeCompare(a.date));
}

export interface PrayerIndicators {
  gathered: number;
  regions: number;
  answered: number;
}

export function countPrayerIndicators(
  requests: readonly PrayerRequest[],
): PrayerIndicators {
  return {
    gathered: requests.length,
    regions: new Set(requests.map((request) => request.region)).size,
    answered: requests.filter((request) => request.answered).length,
  };
}

export interface PrayerRegionGroup {
  region: RegionKey;
  labelKey: string;
  requests: PrayerRequest[];
}

const REGION_ORDER: readonly RegionKey[] = REGIONS.map(
  (definition) => definition.key,
);

export function groupPrayerRequests(
  requests: readonly PrayerRequest[],
): PrayerRegionGroup[] {
  const byRegion = new Map<RegionKey, PrayerRequest[]>();
  for (const request of requests) {
    const group = byRegion.get(request.region);
    if (group) group.push(request);
    else byRegion.set(request.region, [request]);
  }
  return [...byRegion.entries()]
    .sort(
      ([regionA, groupA], [regionB, groupB]) =>
        groupB.length - groupA.length ||
        REGION_ORDER.indexOf(regionA) - REGION_ORDER.indexOf(regionB),
    )
    .map(([region, grouped]) => ({
      region,
      labelKey: getRegionLabelKey(region),
      requests: grouped,
    }));
}
