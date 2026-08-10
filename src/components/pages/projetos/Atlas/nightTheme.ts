import type { ProjectPriority } from "../../../../types/project";

export const NIGHT_MARKER_TONES: Record<
  ProjectPriority,
  { fillClass: string; glowOpacity: number }
> = {
  default: { fillClass: "fill-night-good", glowOpacity: 0.45 },
  completed: { fillClass: "fill-night-good", glowOpacity: 0.5 },
  warning: { fillClass: "fill-night-warning", glowOpacity: 0.5 },
  critical: { fillClass: "fill-night-critical", glowOpacity: 0.65 },
  canceled: { fillClass: "fill-night-canceled", glowOpacity: 0.3 },
  paused: { fillClass: "fill-night-paused", glowOpacity: 0.4 },
  planned: { fillClass: "fill-night-planned", glowOpacity: 0.5 },
  unknown: { fillClass: "fill-tone-unknown", glowOpacity: 0.35 },
};

export const STAGE_BACKGROUND = [
  "radial-gradient(ellipse at 25% 15%, rgba(123, 75, 158, 0.16) 0%, transparent 35%)",
  "radial-gradient(ellipse at 75% 80%, rgba(190, 74, 1, 0.10) 0%, transparent 45%)",
  "radial-gradient(ellipse at 50% 50%, rgba(40, 30, 60, 0.5) 0%, transparent 70%)",
  "linear-gradient(160deg, var(--night-sky-1) 0%, var(--night-sky-2) 40%, var(--night-sky-3) 100%)",
].join(", ");

export const STAR_FIELD = [
  "radial-gradient(1.5px 1.5px at 8% 12%, rgba(255,255,255,0.95), transparent 60%)",
  "radial-gradient(1px 1px at 18% 24%, rgba(246,245,235,0.7), transparent 60%)",
  "radial-gradient(1.2px 1.2px at 28% 8%, rgba(255,255,255,0.85), transparent 60%)",
  "radial-gradient(0.8px 0.8px at 38% 16%, rgba(246,245,235,0.5), transparent 60%)",
  "radial-gradient(1.4px 1.4px at 48% 6%, rgba(255,255,255,0.9), transparent 60%)",
  "radial-gradient(0.9px 0.9px at 58% 14%, rgba(246,245,235,0.6), transparent 60%)",
  "radial-gradient(1.1px 1.1px at 68% 22%, rgba(255,255,255,0.75), transparent 60%)",
  "radial-gradient(1.3px 1.3px at 78% 8%, rgba(255,225,180,0.85), transparent 60%)",
  "radial-gradient(0.9px 0.9px at 88% 18%, rgba(246,245,235,0.6), transparent 60%)",
  "radial-gradient(1px 1px at 96% 30%, rgba(255,255,255,0.7), transparent 60%)",
  "radial-gradient(1.2px 1.2px at 6% 38%, rgba(255,255,255,0.8), transparent 60%)",
  "radial-gradient(0.8px 0.8px at 14% 52%, rgba(246,245,235,0.5), transparent 60%)",
  "radial-gradient(1.3px 1.3px at 22% 64%, rgba(255,210,170,0.85), transparent 60%)",
  "radial-gradient(1px 1px at 4% 78%, rgba(246,245,235,0.6), transparent 60%)",
  "radial-gradient(0.9px 0.9px at 88% 58%, rgba(246,245,235,0.55), transparent 60%)",
  "radial-gradient(1.4px 1.4px at 94% 70%, rgba(255,255,255,0.85), transparent 60%)",
  "radial-gradient(1.1px 1.1px at 82% 84%, rgba(246,245,235,0.7), transparent 60%)",
  "radial-gradient(1.3px 1.3px at 72% 92%, rgba(255,225,180,0.8), transparent 60%)",
  "radial-gradient(0.8px 0.8px at 62% 76%, rgba(246,245,235,0.5), transparent 60%)",
  "radial-gradient(1px 1px at 48% 88%, rgba(255,255,255,0.65), transparent 60%)",
  "radial-gradient(1.2px 1.2px at 36% 94%, rgba(246,245,235,0.75), transparent 60%)",
  "radial-gradient(1.4px 1.4px at 14% 92%, rgba(255,255,255,0.9), transparent 60%)",
  "radial-gradient(0.9px 0.9px at 30% 76%, rgba(246,245,235,0.55), transparent 60%)",
].join(", ");

export const STAR_LAYER = [
  "radial-gradient(1px 1px at 11% 30%, rgba(255,255,255,0.6), transparent 65%)",
  "radial-gradient(1px 1px at 23% 42%, rgba(255,255,255,0.45), transparent 65%)",
  "radial-gradient(1px 1px at 35% 28%, rgba(255,255,255,0.5), transparent 65%)",
  "radial-gradient(1px 1px at 53% 38%, rgba(255,255,255,0.55), transparent 65%)",
  "radial-gradient(1px 1px at 67% 58%, rgba(255,255,255,0.5), transparent 65%)",
  "radial-gradient(1px 1px at 75% 32%, rgba(255,255,255,0.45), transparent 65%)",
  "radial-gradient(1px 1px at 89% 44%, rgba(255,255,255,0.55), transparent 65%)",
  "radial-gradient(1px 1px at 92% 88%, rgba(255,255,255,0.5), transparent 65%)",
  "radial-gradient(1px 1px at 9% 64%, rgba(255,255,255,0.45), transparent 65%)",
  "radial-gradient(1px 1px at 41% 72%, rgba(255,255,255,0.6), transparent 65%)",
  "radial-gradient(ellipse 380px 200px at 12% 88%, rgba(190, 74, 1, 0.05), transparent 70%)",
  "radial-gradient(ellipse 420px 240px at 88% 16%, rgba(80, 110, 180, 0.07), transparent 70%)",
].join(", ");

export const GRATICULE_LATS = [-60, -30, 0, 30, 60];

export const GRATICULE_LNGS = [
  -150, -120, -90, -60, -30, 0, 30, 60, 90, 120, 150, 180,
];
