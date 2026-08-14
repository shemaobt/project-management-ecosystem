import { useTranslation } from "react-i18next";
import type { RegionKey } from "../../../types/region";
import type { PrayerRegionGroup } from "../../../utils/prayer";
import { ChipRadio, RadioGroup } from "../../ui";

export type ContinentFilterValue = RegionKey | "all";

export const ALL_CONTINENTS: ContinentFilterValue = "all";

export interface ContinentFilterProps {
  groups: readonly PrayerRegionGroup[];
  total: number;
  value: ContinentFilterValue;
  onChange: (value: ContinentFilterValue) => void;
}

export function ContinentFilter({
  groups,
  total,
  value,
  onChange,
}: ContinentFilterProps) {
  const { t } = useTranslation();

  return (
    <RadioGroup
      aria-label={t("oracao_filter_label")}
      value={value}
      onValueChange={(next) => {
        if (next === ALL_CONTINENTS) return onChange(ALL_CONTINENTS);
        const group = groups.find((entry) => entry.region === next);
        if (group) onChange(group.region);
      }}
      className="mb-5 gap-2"
    >
      <ChipRadio value={ALL_CONTINENTS} label={t("oracao_all")} count={total} />
      {groups.map((group) => (
        <ChipRadio
          key={group.region}
          value={group.region}
          label={t(group.labelKey)}
          count={group.requests.length}
        />
      ))}
    </RadioGroup>
  );
}
