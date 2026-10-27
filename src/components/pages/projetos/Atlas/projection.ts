import type { Coordinates } from "../../../../types/project";

export interface ProjectedPoint {
  x: number;
  y: number;
  z: number;
}

export function orthoProject(
  lng: number,
  lat: number,
  lambda: number,
  phi: number,
): ProjectedPoint {
  const dLng = ((lng - lambda) * Math.PI) / 180;
  const latR = (lat * Math.PI) / 180;
  const phiR = (phi * Math.PI) / 180;
  const cosLat = Math.cos(latR);
  const sinLat = Math.sin(latR);
  const cosDLng = Math.cos(dLng);
  const sinDLng = Math.sin(dLng);
  return {
    x: cosLat * sinDLng,
    y: Math.cos(phiR) * sinLat - Math.sin(phiR) * cosLat * cosDLng,
    z: Math.sin(phiR) * sinLat + Math.cos(phiR) * cosLat * cosDLng,
  };
}

export function densifyPolygon(
  poly: readonly Coordinates[],
  stepDeg = 2,
): Coordinates[] {
  const out: Coordinates[] = [];
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    const dLng = b[0] - a[0];
    const dLat = b[1] - a[1];
    const dist = Math.sqrt(dLng * dLng + dLat * dLat);
    const steps = Math.max(1, Math.ceil(dist / stepDeg));
    for (let s = 0; s < steps; s++) {
      const t = s / steps;
      out.push([a[0] + dLng * t, a[1] + dLat * t]);
    }
  }
  return out;
}

export function projectPolygonOutline(
  poly: readonly Coordinates[],
  lambda: number,
  phi: number,
  radius: number,
): [number, number][][] {
  const segments: [number, number][][] = [];
  let current: [number, number][] = [];
  for (const [lng, lat] of poly) {
    const p = orthoProject(lng, lat, lambda, phi);
    if (p.z > 0.02) {
      current.push([p.x * radius, -p.y * radius]);
    } else if (current.length > 1) {
      segments.push(current);
      current = [];
    } else {
      current = [];
    }
  }
  if (current.length > 1) segments.push(current);
  return segments;
}

export function spreadOverlapping<T extends { x: number; y: number }>(
  points: readonly T[],
  cellSize = 6,
  radius = 6,
): T[] {
  const spread = points.map((point) => ({ ...point }));
  const grouped = new Map<string, typeof spread>();
  for (const point of spread) {
    const key = `${Math.round(point.x / cellSize)},${Math.round(point.y / cellSize)}`;
    const group = grouped.get(key);
    if (group) {
      group.push(point);
    } else {
      grouped.set(key, [point]);
    }
  }
  for (const group of grouped.values()) {
    if (group.length > 1) {
      group.forEach((point, index) => {
        const angle = (index / group.length) * Math.PI * 2;
        point.x += Math.cos(angle) * radius;
        point.y += Math.sin(angle) * radius;
      });
    }
  }
  return spread;
}

export interface Offset {
  x: number;
  y: number;
}

export function groupWithin(
  points: readonly Offset[],
  distance: number,
): number[][] {
  const parent = points.map((_, index) => index);
  const root = (index: number): number => {
    let at = index;
    while (parent[at] !== at) {
      parent[at] = parent[parent[at]];
      at = parent[at];
    }
    return at;
  };
  const cells = new Map<string, number[]>();
  points.forEach((point, index) => {
    const cx = Math.floor(point.x / distance);
    const cy = Math.floor(point.y / distance);
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        for (const other of cells.get(`${cx + dx},${cy + dy}`) ?? []) {
          const near =
            Math.hypot(point.x - points[other].x, point.y - points[other].y) <
            distance;
          if (near) parent[root(index)] = root(other);
        }
      }
    }
    const key = `${cx},${cy}`;
    const cell = cells.get(key);
    if (cell) {
      cell.push(index);
    } else {
      cells.set(key, [index]);
    }
  });
  const groups = new Map<number, number[]>();
  points.forEach((_, index) => {
    const key = root(index);
    const group = groups.get(key);
    if (group) {
      group.push(index);
    } else {
      groups.set(key, [index]);
    }
  });
  return [...groups.values()];
}

function ringCapacity(ring: number): number {
  return Math.floor(Math.PI / Math.asin(1 / (2 * ring)) + 1e-9);
}

function packedRings(count: number): number {
  let left = count - 1;
  let ring = 0;
  while (left > 0) {
    ring += 1;
    left -= ringCapacity(ring);
  }
  return ring;
}

function onCircle(radius: number, angle: number): Offset {
  return { x: radius * Math.cos(angle), y: radius * Math.sin(angle) };
}

export function spreadOffsets(count: number, gap: number, start = 0): Offset[] {
  if (count <= 1) return count === 1 ? [{ x: 0, y: 0 }] : [];
  const singleRing = 1 / (2 * Math.sin(Math.PI / count));
  if (singleRing <= packedRings(count) + 1e-9) {
    return Array.from({ length: count }, (_, index) =>
      onCircle(gap * singleRing, start + (2 * Math.PI * index) / count),
    );
  }
  const offsets: Offset[] = [{ x: 0, y: 0 }];
  for (let ring = 1; offsets.length < count; ring++) {
    const members = Math.min(count - offsets.length, ringCapacity(ring));
    for (let index = 0; index < members; index++) {
      offsets.push(
        onCircle(ring * gap, start + (2 * Math.PI * index) / members),
      );
    }
  }
  return offsets;
}

export function sphericalCentre(coords: readonly Coordinates[]): Coordinates {
  let x = 0;
  let y = 0;
  let z = 0;
  for (const [lng, lat] of coords) {
    const lngR = (lng * Math.PI) / 180;
    const latR = (lat * Math.PI) / 180;
    x += Math.cos(latR) * Math.cos(lngR);
    y += Math.cos(latR) * Math.sin(lngR);
    z += Math.sin(latR);
  }
  const lng = (Math.atan2(y, x) * 180) / Math.PI;
  const lat = (Math.atan2(z, Math.hypot(x, y)) * 180) / Math.PI;
  return [lng, lat];
}
