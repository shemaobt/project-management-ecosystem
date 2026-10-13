import type { PrayerSource } from "../types/prayer";
import type { PrayerVisibility } from "../types/project";
import type { SessionRole } from "../types/session";

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

export const PRAYER_SOURCE_LABEL_KEYS: Record<PrayerSource, string> = {
  Formulário: "oracao_source_form",
  Necessidade: "oracao_source_need",
};

/**
 * Who reviews and releases a sensitive project's request (OBT-575): the regional coordination and
 * the Admin, who coordinates every region. The server holds the rule — region by region — and
 * answers 403 to anybody else; this list only decides whether the tab is offered.
 */
export const PRAYER_REVIEW_ROLES: readonly SessionRole[] = ["coordinator", "admin"];
