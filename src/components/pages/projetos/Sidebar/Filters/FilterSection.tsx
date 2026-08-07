import { Minus, Plus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "../../../../../utils/cn";
import { FilterChip } from "./FilterChip";

export interface ResolvedFilterOption {
  value: string;
  label: string;
  count: number;
  critical: boolean;
}

export interface FilterSectionProps {
  id: string;
  title: string;
  open: boolean;
  onToggle: () => void;
  allCount: number;
  options: readonly ResolvedFilterOption[];
  activeValue: string | null;
  onSelect: (value: string | null) => void;
}

export function FilterSection({
  id,
  title,
  open,
  onToggle,
  allCount,
  options,
  activeValue,
  onSelect,
}: FilterSectionProps) {
  const { t } = useTranslation();
  const bodyId = `sb-filter-${id}`;

  return (
    <div className="mb-1.5">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={bodyId}
        onClick={onToggle}
        className={cn(
          "flex w-full items-center justify-between rounded-[10px] px-2.5 py-2",
          "text-tag font-bold tracking-button uppercase text-fg-muted",
          "transition-colors duration-fast ease-out hover:bg-muted hover:text-fg-strong",
          open && "text-fg-strong",
        )}
      >
        <span className="text-left">{title}</span>
        <span
          className={cn(
            "inline-flex size-[18px] items-center justify-center text-fg-subtle",
            open && "text-telha",
          )}
        >
          {open ? (
            <Minus size={12} strokeWidth={2} />
          ) : (
            <Plus size={12} strokeWidth={2} />
          )}
        </span>
      </button>
      {open && (
        <div
          id={bodyId}
          role="group"
          aria-label={title}
          className="px-1 pt-1 pb-2"
        >
          <FilterChip
            label={t("filter_all")}
            count={allCount}
            active={activeValue === null}
            onClick={() => onSelect(null)}
          />
          {options.map((option) => (
            <FilterChip
              key={option.value}
              label={option.label}
              count={option.count}
              active={activeValue === option.value}
              critical={option.critical}
              locked={option.count === 0 && activeValue !== option.value}
              onClick={() => onSelect(option.value)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
