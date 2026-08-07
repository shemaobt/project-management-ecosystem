import { GRATICULE_LATS, GRATICULE_LNGS } from "./nightTheme";
import { orthoProject } from "./projection";

export function GlobeDefs() {
  return (
    <defs>
      <radialGradient id="night-sphere" cx="38%" cy="32%" r="80%">
        <stop offset="0%" style={{ stopColor: "var(--bg-elevated)" }} />
        <stop offset="55%" style={{ stopColor: "var(--shema-branco)" }} />
        <stop offset="100%" style={{ stopColor: "var(--night-rim)" }} />
      </radialGradient>
      <radialGradient id="night-glow" cx="50%" cy="50%" r="62%">
        <stop
          offset="60%"
          style={{ stopColor: "var(--night-cool)" }}
          stopOpacity="0"
        />
        <stop
          offset="92%"
          style={{ stopColor: "var(--night-cool)" }}
          stopOpacity="0.20"
        />
        <stop
          offset="100%"
          style={{ stopColor: "var(--shema-telha)" }}
          stopOpacity="0.32"
        />
      </radialGradient>
      <radialGradient id="terminator" cx="32%" cy="28%" r="88%">
        <stop offset="0%" stopColor="rgba(255,255,255,0)" />
        <stop offset="55%" stopColor="rgba(60,40,30,0)" />
        <stop offset="100%" stopColor="rgba(20,10,30,0.55)" />
      </radialGradient>
      <filter
        id="marker-glow-strong"
        x="-100%"
        y="-100%"
        width="300%"
        height="300%"
      >
        <feGaussianBlur stdDeviation="5" />
        <feComponentTransfer>
          <feFuncA type="linear" slope="2" />
        </feComponentTransfer>
      </filter>
    </defs>
  );
}

export interface GlobeSceneryProps {
  lambda: number;
  phi: number;
  radius: number;
}

export function GlobeGraticule({ lambda, phi, radius }: GlobeSceneryProps) {
  const line = (points: string[]) =>
    points.length < 2 ? null : points.join(" ");
  return (
    <g fill="none" stroke="rgba(63,62,32,0.10)" strokeWidth="0.5">
      {GRATICULE_LATS.map((lat) => {
        const pts: string[] = [];
        for (let lng = -180; lng <= 180; lng += 5) {
          const p = orthoProject(lng, lat, lambda, phi);
          if (p.z > 0) pts.push(`${p.x * radius},${-p.y * radius}`);
        }
        const points = line(pts);
        return points && <polyline key={`lat${lat}`} points={points} />;
      })}
      {GRATICULE_LNGS.map((lng) => {
        const pts: string[] = [];
        for (let lat = -85; lat <= 85; lat += 5) {
          const p = orthoProject(lng, lat, lambda, phi);
          if (p.z > 0) pts.push(`${p.x * radius},${-p.y * radius}`);
        }
        const points = line(pts);
        return points && <polyline key={`lng${lng}`} points={points} />;
      })}
    </g>
  );
}

export function GlobeLand({ segments }: { segments: [number, number][][] }) {
  return (
    <>
      <g
        fill="none"
        stroke="rgba(63, 62, 32, 0.78)"
        strokeWidth="0.9"
        strokeLinejoin="round"
        strokeLinecap="round"
      >
        {segments.map((seg, i) => (
          <polyline
            key={i}
            vectorEffect="non-scaling-stroke"
            points={seg.map(([x, y]) => `${x},${y}`).join(" ")}
          />
        ))}
      </g>
      <g
        fill="rgba(119, 125, 69, 0.12)"
        stroke="rgba(63, 62, 32, 0.18)"
        strokeWidth="0.4"
      >
        {segments
          .filter((seg) => seg.length > 4)
          .map((seg, i) => (
            <polyline
              key={i}
              vectorEffect="non-scaling-stroke"
              points={seg.map(([x, y]) => `${x},${y}`).join(" ")}
            />
          ))}
      </g>
    </>
  );
}
