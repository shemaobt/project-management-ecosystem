import { X } from "lucide-react";
import { circleControl, transitionColors } from "../../../../../styles";
import { cn } from "../../../../../utils/cn";
import { Input } from "../../../../ui";
import { clampCount } from "./sections";

export const TABLE_FRAME =
  "overflow-hidden rounded-md border border-line bg-elevated";

export const TABLE_HEAD_CELL =
  "text-[10px] font-bold tracking-[0.1em] uppercase text-fg-muted";

export const COUNT_GRID =
  "grid grid-cols-[minmax(0,1.8fr)_60px_1fr_1fr_1fr_28px] items-center gap-1.5 px-2.5 py-2";

export interface CountInputProps {
  label: string;
  value: number;
  max?: number;
  onChange: (value: number) => void;
}

export function CountInput({ label, value, max, onChange }: CountInputProps) {
  return (
    <Input
      type="number"
      inputMode="numeric"
      min={0}
      max={max}
      aria-label={label}
      className="px-1.5 py-1.5 text-center tabular-nums"
      value={value}
      onChange={(event) => onChange(clampCount(event.target.value, max))}
    />
  );
}

export interface RemoveRowButtonProps {
  label: string;
  onClick: () => void;
}

export function RemoveRowButton({ label, onClick }: RemoveRowButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cn(
        circleControl,
        transitionColors,
        "size-6.5 flex-none justify-self-center text-fg-muted hover:bg-accent-soft hover:text-telha",
      )}
      onClick={onClick}
    >
      <X size={14} strokeWidth={1.75} />
    </button>
  );
}
