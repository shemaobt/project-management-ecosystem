import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import { Check } from "lucide-react";
import type { ComponentPropsWithoutRef } from "react";
import { cn } from "../../utils/cn";

export function Checkbox({
  className,
  ...props
}: ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      className={cn(
        "flex size-4 shrink-0 items-center justify-center rounded-xs border border-line-strong bg-elevated transition-colors duration-[140ms] ease-out data-[state=checked]:border-telha data-[state=checked]:bg-telha disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator className="text-branco">
        <Check size={11} strokeWidth={3} />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}

export interface CheckboxFieldProps
  extends ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root> {
  label: string;
}

export function CheckboxField({
  label,
  id,
  className,
  ...props
}: CheckboxFieldProps) {
  return (
    <label
      className={cn(
        "inline-flex cursor-pointer items-center gap-1.5 rounded-xs px-2 py-1 text-[13px] transition-colors duration-[140ms] ease-out select-none hover:bg-muted has-[[data-state=checked]]:font-bold has-[[data-state=checked]]:text-telha",
        className,
      )}
      htmlFor={id}
    >
      <Checkbox id={id} {...props} />
      <span>{label}</span>
    </label>
  );
}
