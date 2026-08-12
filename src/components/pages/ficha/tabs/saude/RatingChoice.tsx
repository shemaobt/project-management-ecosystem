import { useTranslation } from "react-i18next";
import { RATING_TONES } from "../../../../../constants/health";
import { HEALTH_LEVELS } from "../../../../../constants/project";
import { HEALTH_LABEL_KEYS, HEALTH_SYMBOLS } from "../../../../../constants/status";
import type { HealthRating } from "../../../../../types/project";
import { cn } from "../../../../../utils/cn";
import { RadioButton, RadioGroup } from "../../../../ui";

const NOT_ASSESSED = "na";

const OPTION =
  "inline-flex flex-1 items-center justify-center gap-1.5 rounded-sm border border-line bg-elevated px-2.5 py-2 text-micro font-semibold text-fg hover:border-fg-muted";

export interface RatingChoiceProps {
  name: string;
  value: HealthRating;
  onChange: (next: HealthRating) => void;
  describedBy?: string;
}

export function RatingChoice({
  name,
  value,
  onChange,
  describedBy,
}: RatingChoiceProps) {
  const { t } = useTranslation();
  const choices: HealthRating[] = [...HEALTH_LEVELS, ""];

  return (
    <RadioGroup
      value={value || NOT_ASSESSED}
      onValueChange={(next) => onChange(next === NOT_ASSESSED ? "" : (next as HealthRating))}
      aria-label={name}
      aria-describedby={describedBy}
      className="gap-1.5"
    >
      {choices.map((choice) => {
        const option = choice || NOT_ASSESSED;
        return (
          <RadioButton
            key={option}
            value={option}
            className={cn(OPTION, RATING_TONES[choice])}
          >
            <span aria-hidden className="font-black">
              {HEALTH_SYMBOLS[choice === "" ? "na" : choice]}
            </span>
            {choice === "" ? t("health_not_assessed") : t(HEALTH_LABEL_KEYS[choice])}
          </RadioButton>
        );
      })}
    </RadioGroup>
  );
}
