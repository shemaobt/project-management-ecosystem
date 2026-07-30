import type { PresetId } from "../types/project";

export interface PresetDefinition {
  id: PresetId;
  icon: string;
  titleKey: string;
  descriptionKey: string;
}

export const PRESETS: readonly PresetDefinition[] = [
  {
    id: "attention",
    icon: "alert",
    titleKey: "preset_urgent",
    descriptionKey: "preset_urgent_sub",
  },
  {
    id: "prayer",
    icon: "prayer",
    titleKey: "preset_prayer",
    descriptionKey: "preset_prayer_sub",
  },
  {
    id: "celebrate",
    icon: "spark",
    titleKey: "preset_celebrate",
    descriptionKey: "preset_celebrate_sub",
  },
  {
    id: "recent",
    icon: "clock",
    titleKey: "preset_recent",
    descriptionKey: "preset_recent_sub",
  },
];
