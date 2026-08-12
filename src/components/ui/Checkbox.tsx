import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import { Check } from "lucide-react";
import type { ComponentPropsWithoutRef } from "react";
import { cn } from "../../utils/cn";
import { transitionColors } from "../../styles";
import { optionLabel } from "./option";

export function Checkbox({
  className,
  ...props
}: ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      className={cn(
        `flex size-4 shrink-0 items-center justify-center rounded-xs border border-line-strong bg-elevated ${transitionColors} data-[state=checked]:border-telha data-[state=checked]:bg-telha disabled:cursor-not-allowed disabled:opacity-50`,
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator className="text-on-brand">
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
    <label className={cn(optionLabel, className)} htmlFor={id}>
      <Checkbox id={id} {...props} />
      <span>{label}</span>
    </label>
  );
}
