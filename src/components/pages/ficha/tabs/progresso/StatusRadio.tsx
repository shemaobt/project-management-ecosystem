import { useTranslation } from "react-i18next";
import type { ProjectStatus } from "../../../../../types/project";
import { cn } from "../../../../../utils/cn";
import { transitionColors } from "../../../../../styles";
import { Radio, RadioGroup } from "../../../../ui";
import { statusOptionsFor } from "./sections";

export interface StatusRadioProps {
  value: ProjectStatus;
  anchor?: ProjectStatus;
  onChange: (value: ProjectStatus) => void;
}

export function StatusRadio({ value, anchor, onChange }: StatusRadioProps) {
  const { t } = useTranslation();
  const options = statusOptionsFor(value, anchor);

  return (
    <RadioGroup
      value={value}
      onValueChange={(next) => {
        const option = options.find((entry) => entry.value === next);
        if (option) onChange(option.value);
      }}
      className="grid grid-cols-1 gap-2.5 sm:grid-cols-3"
    >
      {options.map((option) => (
        <label
          key={option.value}
          htmlFor={`ficha-status-${option.value}`}
          className={cn(
            "flex cursor-pointer items-center gap-2.5 rounded-md border-2 bg-elevated px-3.5 py-3",
            transitionColors,
            option.card,
            value === option.value ? option.activeCard : "border-line",
          )}
        >
          <Radio id={`ficha-status-${option.value}`} value={option.value} />
          <span className="text-small font-semibold text-fg">
            {t(option.labelKey)}
          </span>
        </label>
      ))}
    </RadioGroup>
  );
}
