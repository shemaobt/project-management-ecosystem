import { useId } from "react";
import { useTranslation } from "react-i18next";
import { REGIONS } from "../../../constants/regions";
import { ROLES } from "../../../constants/roles";
import type { RegionKey } from "../../../types/region";
import { InfoTooltip } from "../../common/InfoTooltip";
import { CheckboxField } from "../../ui";

export interface RegionPickerProps {
  legend: string;
  selected: readonly RegionKey[];
  onChange: (next: RegionKey[]) => void;
  disabled?: boolean;
  ruleOpen?: boolean;
}

export function RegionPicker({
  legend,
  selected,
  onChange,
  disabled = false,
  ruleOpen = false,
}: RegionPickerProps) {
  const { t } = useTranslation();
  const fieldId = useId();

  const toggle = (key: RegionKey, checked: boolean) =>
    onChange(
      REGIONS.filter((region) =>
        region.key === key ? checked : selected.includes(region.key),
      ).map((region) => region.key),
    );

  return (
    <fieldset
      disabled={disabled}
      className="flex flex-col gap-3 rounded-md bg-muted px-4 py-3.5"
    >
      <legend className="float-left mb-1 w-full text-micro font-bold tracking-button uppercase text-fg-muted">
        {legend}
      </legend>
      <InfoTooltip label={t("acesso_regional_rule_label")} defaultOpen={ruleOpen}>
        {t("acesso_regional_rule", {
          roles: ROLES.map((role) => t(role.labelKey)).join(", "),
        })}
      </InfoTooltip>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {REGIONS.map((region) => (
          <CheckboxField
            key={region.key}
            id={`${fieldId}-${region.key}`}
            label={t(region.labelKey)}
            checked={selected.includes(region.key)}
            onCheckedChange={(state) => toggle(region.key, state === true)}
          />
        ))}
      </div>
      {selected.length === 0 ? (
        <p className="text-micro leading-[1.45] font-semibold text-accent-press">
          {t("acesso_regions_required")}
        </p>
      ) : (
        <p className="text-micro text-fg-muted">
          {t("acesso_regions_count", { count: selected.length })}
        </p>
      )}
    </fieldset>
  );
}
