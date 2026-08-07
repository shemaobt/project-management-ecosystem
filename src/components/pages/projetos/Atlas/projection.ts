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
