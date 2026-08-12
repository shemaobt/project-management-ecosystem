import { X } from "lucide-react";
import { circleControl, transitionColors } from "../../styles";
import { cn } from "../../utils/cn";

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
