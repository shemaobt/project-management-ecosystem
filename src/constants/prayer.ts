import type { PrayerVisibility } from "../types/project";

export const PRAYER_VISIBILITIES = ["coordenacao", "rede"] as const;

export const DEFAULT_PRAYER_VISIBILITY: PrayerVisibility = "coordenacao";

export const PRAYER_VISIBILITY_LABEL_KEYS: Record<PrayerVisibility, string> = {
  coordenacao: "prayer_vis_coordination",
  rede: "prayer_vis_network",
};

export const PRAYER_VISIBILITY_HINT_KEYS: Record<PrayerVisibility, string> = {
  coordenacao: "prayer_vis_coordination_hint",
  rede: "prayer_vis_network_hint",
};

export function isPrayerVisibility(value: string): value is PrayerVisibility {
  return (PRAYER_VISIBILITIES as readonly string[]).includes(value);
}
