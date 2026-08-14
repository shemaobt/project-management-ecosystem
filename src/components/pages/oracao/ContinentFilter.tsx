import { useTranslation } from "react-i18next";
import type { RegionKey } from "../../../types/region";
import type { PrayerRegionGroup } from "../../../utils/prayer";
import { RadioButton, RadioGroup } from "../../ui";

export type ContinentFilterValue = RegionKey | "all";

export const ALL_CONTINENTS: ContinentFilterValue = "all";

export interface ContinentFilterProps {
  groups: readonly PrayerRegionGroup[];
  total: number;
  value: ContinentFilterValue;
  onChange: (value: ContinentFilterValue) => void;
}

const chip =
  "group inline-flex items-center gap-1.75 rounded-pill border border-line bg-elevated px-3.5 py-2.25 text-[13px] leading-none font-semibold text-fg data-[state=checked]:border-telha data-[state=checked]:bg-telha data-[state=checked]:text-on-brand";

const chipCount =
  "text-[11px] font-bold text-fg-subtle group-data-[state=checked]:text-on-brand/80";

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
      <RadioButton value={ALL_CONTINENTS} className={chip}>
        {t("oracao_all")} <span className={chipCount}>{total}</span>
      </RadioButton>
      {groups.map((group) => (
        <RadioButton key={group.region} value={group.region} className={chip}>
          {t(group.labelKey)}{" "}
          <span className={chipCount}>{group.requests.length}</span>
        </RadioButton>
      ))}
    </RadioGroup>
  );
}
