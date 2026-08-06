import type { LabelHTMLAttributes } from "react";
import { cn } from "../../utils/cn";
import { labelBase } from "./fieldStyles";

export function Label({
  className,
  ...props
}: LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn(labelBase, className)} {...props} />;
}
