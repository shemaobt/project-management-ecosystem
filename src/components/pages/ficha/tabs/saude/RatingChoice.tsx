import { useTranslation } from "react-i18next";
import { RATING_TONES } from "../../../../../constants/health";
import { HEALTH_LEVELS } from "../../../../../constants/project";
import { HEALTH_LABEL_KEYS, HEALTH_SYMBOLS } from "../../../../../constants/status";
import type { HealthRating } from "../../../../../types/project";
import { cn } from "../../../../../utils/cn";

const NOT_ASSESSED: HealthRating = "";

const OPTION =
  "inline-flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-sm border px-2.5 py-2 text-micro font-semibold transition-colors duration-fast ease-out";

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
  const choices: HealthRating[] = [...HEALTH_LEVELS, NOT_ASSESSED];

  return (
    <div
      role="radiogroup"
      aria-label={name}
      aria-describedby={describedBy}
      className="flex flex-wrap gap-1.5"
    >
      {choices.map((choice) => {
        const on = value === choice;
        const label =
          choice === ""
            ? t("health_not_assessed")
            : t(HEALTH_LABEL_KEYS[choice]);
        return (
          <button
            key={choice || "na"}
            type="button"
            role="radio"
            aria-checked={on}
            data-on={on}
            onClick={() => onChange(choice)}
            className={cn(
              OPTION,
              "border-line bg-elevated text-fg hover:border-fg-muted",
              RATING_TONES[choice],
            )}
          >
            <span aria-hidden className="font-black">
              {HEALTH_SYMBOLS[choice === "" ? "na" : choice]}
            </span>
            {label}
          </button>
        );
      })}
    </div>
  );
}
