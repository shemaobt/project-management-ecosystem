import type { Coordinates, Project } from "../../../../types/project";
import { getProjectStatus } from "../../../../utils/progress";
import {
  getMapPlacement,
  getRegion,
  type MapPlacement,
} from "../../../../utils/region";
import {
  groupWithin,
  orthoProject,
  sphericalCentre,
  spreadOffsets,
  spreadOverlapping,
} from "./projection";

export interface AtlasMarkerSource {
  project: Project;
  placement: MapPlacement;
}

export function buildMarkerSources(
  projects: readonly Project[],
): AtlasMarkerSource[] {
  return projects.map((project) => ({
    project,
    placement: getMapPlacement(project),
  }));
}

export interface ProjectedSource {
  source: AtlasMarkerSource;
  x: number;
  y: number;
  z: number;
  visible: boolean;
}

export interface ProjectedMarker extends ProjectedSource {
  group: readonly string[];
  spread: boolean;
}

export interface MarkerLayout {
  sources: readonly AtlasMarkerSource[];
  rotation: { lambda: number; phi: number };
  radius: number;
  gap: number;
  spread: readonly string[] | null;
}

const idOf = (marker: ProjectedSource) => marker.source.project.id;

function spreadAround(
  members: readonly ProjectedSource[],
  gap: number,
): ProjectedMarker[] {
  const cx = members.reduce((sum, m) => sum + m.x, 0) / members.length;
  const cy = members.reduce((sum, m) => sum + m.y, 0) / members.length;
  const angleOf = (m: ProjectedSource) =>
    Math.hypot(m.x - cx, m.y - cy) < 1e-6 ? 0 : Math.atan2(m.y - cy, m.x - cx);
  const ordered = [...members].sort((a, b) => angleOf(a) - angleOf(b));
  const offsets = spreadOffsets(ordered.length, gap, angleOf(ordered[0]));
  const group = members.map(idOf);
  return ordered.map((member, index) => ({
    ...member,
    x: cx + offsets[index].x,
    y: cy + offsets[index].y,
    group,
    spread: true,
  }));
}

export function placeMarkers({
  sources,
  rotation,
  radius,
  gap,
  spread,
}: MarkerLayout): ProjectedMarker[] {
  const projected: ProjectedSource[] = sources.map((source) => {
    const [lng, lat] = source.placement.coords;
    const p = orthoProject(lng, lat, rotation.lambda, rotation.phi);
    return {
      source,
      x: p.x * radius,
      y: -p.y * radius,
      z: p.z,
      visible: p.z > -0.05,
    };
  });
  const spreadIds = new Set(spread ?? []);
  const isSpread = (m: ProjectedSource) => m.visible && spreadIds.has(idOf(m));
  const placed = new Map<string, ProjectedMarker>();

  const resting = spreadOverlapping(
    projected.filter((m) => m.visible && !isSpread(m)),
  );
  for (const indices of groupWithin(resting, gap)) {
    const group = indices.map((index) => idOf(resting[index]));
    for (const index of indices) {
      placed.set(idOf(resting[index]), {
        ...resting[index],
        group,
        spread: false,
      });
    }
  }
  const members = projected.filter(isSpread);
  if (members.length > 0) {
    for (const marker of spreadAround(members, gap)) {
      placed.set(idOf(marker), marker);
    }
  }
  return projected.map(
    (m) => placed.get(idOf(m)) ?? { ...m, group: [idOf(m)], spread: false },
  );
}

export function opensProject(marker: ProjectedMarker): boolean {
  return marker.spread || marker.group.length === 1;
}

export interface MarkerClick {
  spread: readonly string[] | null;
  select: string | null;
  focus: Coordinates;
}

export function markerClick(
  marker: ProjectedMarker,
  markers: readonly ProjectedMarker[],
): MarkerClick {
  if (opensProject(marker)) {
    return {
      spread: marker.spread ? marker.group : null,
      select: idOf(marker),
      focus: marker.source.placement.coords,
    };
  }
  const members = markers.filter((m) => marker.group.includes(idOf(m)));
  return {
    spread: marker.group,
    select: null,
    focus: sphericalCentre(members.map((m) => m.source.placement.coords)),
  };
}

export function paintOrder(
  markers: readonly ProjectedMarker[],
): ProjectedMarker[] {
  const visible = markers.filter((m) => m.visible);
  return [
    ...visible.filter((m) => !m.spread),
    ...visible.filter((m) => m.spread),
  ];
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
    projects.map((project) => project.derived?.region ?? getRegion(project)),
  );
  return { total: projects.length, inProgress, regions: regions.size };
}
