import { Clock, TriangleAlert } from "lucide-react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { useFiltersStore } from "../../../../stores/filtersStore";
import type { PresetId } from "../../../../types/project";
import { cn } from "../../../../utils/cn";

function PrayerIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M11 21v-3a4 4 0 0 0-2-3.5L4 11" />
      <path d="M13 3v3a4 4 0 0 0 2 3.5L20 13" />
      <path d="M13 21v-3" />
      <path d="M11 3v3" />
    </svg>
  );
}

function SparkIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1" />
    </svg>
  );
}

interface PresetChip {
  id: PresetId;
  icon: ReactNode;
  titleKey: string;
  subKey: string;
}

const PRESET_CHIPS: readonly PresetChip[] = [
  {
    id: "attention",
    icon: <TriangleAlert size={14} strokeWidth={1.75} />,
    titleKey: "preset_urgent",
    subKey: "preset_urgent_sub",
  },
  {
    id: "prayer",
    icon: <PrayerIcon />,
    titleKey: "preset_prayer",
    subKey: "preset_prayer_sub",
  },
  {
    id: "celebrate",
    icon: <SparkIcon />,
    titleKey: "preset_celebrate",
    subKey: "preset_celebrate_sub",
  },
  {
    id: "recent",
    icon: <Clock size={14} strokeWidth={1.75} />,
    titleKey: "preset_recent",
    subKey: "preset_recent_sub",
  },
];

export interface ChipsProps {
  counts: Record<PresetId, number>;
}

export function Chips({ counts }: ChipsProps) {
  const { t } = useTranslation();
  const filters = useFiltersStore((state) => state.filters);
  const togglePreset = useFiltersStore((state) => state.togglePreset);

  return (
    <div className="mb-3 flex flex-wrap gap-1.5">
      {PRESET_CHIPS.map((preset) => {
        const count = counts[preset.id];
        const active = filters[preset.id];
        const empty = count === 0;
        return (
          <button
            key={preset.id}
            type="button"
            disabled={empty}
            aria-pressed={active}
            title={t(preset.subKey)}
            onClick={() => togglePreset(preset.id)}
            className={cn(
              "group flex min-w-0 flex-[1_1_calc(50%-3px)] items-center gap-[7px] rounded-[12px] border border-line bg-elevated px-[11px] py-[9px]",
              "text-left text-micro font-semibold tracking-[0.01em] text-fg",
              "transition-all duration-fast ease-out",
              active && "border-telha bg-telha text-on-brand shadow-accent",
              empty
                ? "opacity-70"
                : "cursor-pointer hover:border-telha hover:bg-accent-soft hover:text-telha",
            )}
          >
            <span className="flex shrink-0 items-center justify-center">
              {preset.icon}
            </span>
            <span className="flex-1 truncate">{t(preset.titleKey)}</span>
            <span
              className={cn(
                "shrink-0 rounded-pill bg-muted px-[7px] py-px text-[10px] font-bold text-fg-subtle",
                active && "bg-elevated/22 text-on-brand",
                !empty && "group-hover:bg-elevated group-hover:text-telha",
              )}
            >
              {count}
            </span>
          </button>
        );
      })}
    </div>
  );
}
