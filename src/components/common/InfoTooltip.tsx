import { Info } from "lucide-react";
import { useId, useState, type ReactNode } from "react";
import { cn } from "../../utils/cn";

export interface InfoTooltipProps {
  label: string;
  children: ReactNode;
  defaultOpen?: boolean;
  className?: string;
}

export function InfoTooltip({
  label,
  children,
  defaultOpen = false,
  className,
}: InfoTooltipProps) {
  const noteId = useId();
  const [open, setOpen] = useState(defaultOpen);

  return (
    <span className={cn("inline-flex flex-col items-start", className)}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={noteId}
        aria-label={label}
        title={label}
        onClick={() => setOpen((current) => !current)}
        className="inline-flex size-6 items-center justify-center rounded-pill text-fg-muted transition-colors duration-fast ease-out hover:bg-muted hover:text-fg"
      >
        <Info size={15} strokeWidth={1.75} aria-hidden />
      </button>
      <span
        id={noteId}
        hidden={!open}
        className="mt-1.5 block max-w-[60ch] rounded-md bg-muted px-3 py-2 text-micro leading-[1.5] font-normal tracking-normal normal-case text-fg"
      >
        {children}
      </span>
    </span>
  );
}
