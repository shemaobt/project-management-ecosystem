import type { Project } from "../../../../types/project";
import { getProjectStatus } from "../../../../utils/progress";
import { getMapPlacement, type MapPlacement } from "../../../../utils/region";

export interface AtlasMarkerSource {
  project: Project;
  placement: MapPlacement;
}

export function buildMarkerSources(
  projects: readonly Project[],
): AtlasMarkerSource[] {
  return projects.flatMap((project) => {
    const placement = getMapPlacement(project);
    return placement ? [{ project, placement }] : [];
  });
}

export function countWithheld(
  sources: readonly AtlasMarkerSource[],
): number {
  return sources.filter((source) => source.placement.precision === "region")
    .length;
}

export function markerRadius(project: Project): number {
  const speakers = Number(project.speakerCount) || 0;
  if (speakers > 100000) return 5.5;
  if (speakers > 10000) return 4.8;
  return 4.2;
}

export interface NightStats {
  total: number;
  inProgress: number;
  regions: number;
}

export function buildNightStats(projects: readonly Project[]): NightStats {
  const inProgress = projects.filter((project) => {
    const status = getProjectStatus(project);
    return status === "em-andamento" || status === "final";
  }).length;
  const regions = new Set(
    projects
      .map((project) => project.location.split(",").pop()?.trim())
      .filter(Boolean),
  );
  return { total: projects.length, inProgress, regions: regions.size };
}
