import { Lock, Send } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  PRAYER_VISIBILITIES,
  PRAYER_VISIBILITY_HINT_KEYS,
  PRAYER_VISIBILITY_LABEL_KEYS,
} from "../../../../../constants/prayer";
import type { PrayerVisibility } from "../../../../../types/project";
import { cn } from "../../../../../utils/cn";

const ICON = { coordenacao: Lock, rede: Send };

export interface PrayerConsentProps {
  value: PrayerVisibility;
  onChange: (next: PrayerVisibility) => void;
}

export function PrayerConsent({ value, onChange }: PrayerConsentProps) {
  const { t } = useTranslation();

  return (
    <fieldset className="rounded-[12px] border border-line-strong bg-muted p-4">
      <legend className="px-1 text-[10px] font-bold tracking-[0.14em] uppercase text-fg-muted">
        {t("prayer_vis_label")}
      </legend>

      <div className="mt-1 flex flex-col gap-2">
        {PRAYER_VISIBILITIES.map((option) => {
          const on = value === option;
          const Icon = ICON[option];
          return (
            <label
              key={option}
              className={cn(
                "flex cursor-pointer items-start gap-2.5 rounded-[10px] border p-3 transition-colors duration-fast ease-out",
                on
                  ? "border-telha bg-accent-soft"
                  : "border-line bg-elevated hover:border-fg-muted",
              )}
            >
              <input
                type="radio"
                name="prayer-visibility"
                value={option}
                checked={on}
                onChange={() => onChange(option)}
                className="sr-only"
              />
              <Icon
                size={16}
                strokeWidth={1.75}
                aria-hidden
                className={cn("mt-px shrink-0", on ? "text-telha" : "text-fg-muted")}
              />
              <span className="min-w-0 flex-1">
                <span
                  className={cn(
                    "block text-micro font-bold tracking-button uppercase",
                    on ? "text-telha" : "text-fg-strong",
                  )}
                >
                  {t(PRAYER_VISIBILITY_LABEL_KEYS[option])}
                </span>
                <span className="mt-1 block text-micro leading-[1.45] text-fg">
                  {t(PRAYER_VISIBILITY_HINT_KEYS[option])}
                </span>
              </span>
            </label>
          );
        })}
      </div>

      <p className="mt-2.5 text-micro leading-[1.45] text-fg-subtle">
        {t("prayer_vis_default_note")}
      </p>
    </fieldset>
  );
}
