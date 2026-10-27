import type { TFunction } from "i18next";
import { PRESETS } from "../../../../constants/presets";
import {
  activeFilterKeys,
  type ProjectFilters,
} from "../../../../stores/filtersStore";
import type { GatedFacet } from "../../../../utils/gatedFacets";
import { getRegionLabelKey } from "../../../../utils/region";
import {
  ADVANCED_SECTIONS,
  PRIMARY_SECTIONS,
  type FilterOptionsById,
} from "./Filters/sections";

export interface ActiveFilterChip {
  key: keyof ProjectFilters;
  labelKey: string | null;
  value: string;
  titleKey: string | null;
}

const SECTIONS = [...PRIMARY_SECTIONS, ...ADVANCED_SECTIONS];

/**
 * One chip per active filter, as the prototype's strip builds them (`app.jsx:243-262`): a
 * chip says what its option says in the sidebar — `buildFilterOptions` is that label's
 * owner — and a value the sidebar does not list (a base no project carries any more) reads
 * as itself. A group the reader is not told draws no chip, for the reason `shownSections`
 * draws no section.
 */
export function activeFilterChips(
  filters: ProjectFilters,
  options: FilterOptionsById,
  hidden: readonly GatedFacet[],
): ActiveFilterChip[] {
  return activeFilterKeys(filters)
    .filter((key) => !hidden.some((group) => group === key))
    .map((key) => {
      const preset = PRESETS.find((definition) => definition.id === key);
      if (preset) {
        return { key, labelKey: preset.titleKey, value: key, titleKey: null };
      }
      if (key === "continent") {
        const region = filters.continent;
        return {
          key,
          labelKey: region ? getRegionLabelKey(region) : null,
          value: region ?? "",
          titleKey: null,
        };
      }
      const value = String(filters[key]);
      const section = SECTIONS.find((config) => config.id === key);
      const spec = section
        ? options[section.id].find((option) => option.value === value)
        : undefined;
      return {
        key,
        labelKey: spec?.labelKey ?? null,
        value,
        titleKey: section?.titledChip ? section.titleKey : null,
      };
    });
}

export function chipLabel(chip: ActiveFilterChip, t: TFunction): string {
  const label = chip.labelKey ? t(chip.labelKey) : chip.value;
  return chip.titleKey ? `${t(chip.titleKey)}: ${label}` : label;
}

/**
 * Which chip takes focus once the one at `removed` is gone: the chip that slid into its
 * place, or the one before it when the last went. `null` when no chip is left — the strip
 * leaves with it, and focus goes to what follows it.
 */
export function focusIndexAfterRemoval(
  removed: number,
  remaining: number,
): number | null {
  if (remaining === 0) return null;
  return Math.min(removed, remaining - 1);
}
