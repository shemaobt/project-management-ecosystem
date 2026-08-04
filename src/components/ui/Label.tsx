import type { LabelHTMLAttributes } from "react";
import { cn } from "../../utils/cn";

export function Label({
  className,
  ...props
}: LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn(
        "text-tag font-bold tracking-[0.1em] text-fg-muted uppercase",
        className,
      )}
      {...props}
    />
  );
}
