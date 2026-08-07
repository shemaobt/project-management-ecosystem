import { transitionAll } from "../../../../../styles";
import { cn } from "../../../../../utils/cn";

export interface FilterChipProps {
  label: string;
  count: number;
  active: boolean;
  critical?: boolean;
  locked?: boolean;
  onClick: () => void;
}

export function FilterChip({
  label,
  count,
  active,
  critical = false,
  locked = false,
  onClick,
}: FilterChipProps) {
  return (
    <button
      type="button"
      disabled={locked}
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "flex w-full cursor-pointer items-center justify-between gap-2 rounded-sm px-2.5 py-1.5",
        "text-left text-micro font-medium text-fg",
        transitionAll,
        "disabled:pointer-events-none disabled:opacity-45",
        active
          ? "bg-inverse font-semibold text-on-dark"
          : "hover:bg-telha/6 hover:text-telha",
        critical && !active && "text-telha",
      )}
    >
      <span className="min-w-0 truncate">{label}</span>
      <span
        className={cn(
          "shrink-0 rounded-pill px-[7px] py-[2px] text-[10px] font-semibold tabular-nums",
          active
            ? "bg-on-dark/20 text-on-dark"
            : critical
              ? "bg-accent-soft text-telha"
              : "bg-verde/8 text-fg-muted",
        )}
      >
        {count}
      </span>
    </button>
  );
}
