import * as RadioGroupPrimitive from "@radix-ui/react-radio-group";
import type { ComponentPropsWithoutRef } from "react";
import { cn } from "../../utils/cn";
import { transitionColors } from "../../styles";
import { optionLabel } from "./option";

export function RadioGroup({
  className,
  ...props
}: ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Root>) {
  return (
    <RadioGroupPrimitive.Root
      className={cn("flex flex-wrap", className)}
      {...props}
    />
  );
}

export function Radio({
  className,
  ...props
}: ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Item>) {
  return (
    <RadioGroupPrimitive.Item
      className={cn(
        `flex size-4 shrink-0 items-center justify-center rounded-pill border border-line-strong bg-elevated ${transitionColors} data-[state=checked]:border-telha disabled:cursor-not-allowed disabled:opacity-50`,
        className,
      )}
      {...props}
    >
      <RadioGroupPrimitive.Indicator className="size-2 rounded-pill bg-telha" />
    </RadioGroupPrimitive.Item>
  );
}

export function RadioButton({
  className,
  ...props
}: ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Item>) {
  return (
    <RadioGroupPrimitive.Item
      className={cn(
        `cursor-pointer ${transitionColors} disabled:cursor-not-allowed disabled:opacity-50`,
        className,
      )}
      {...props}
    />
  );
}

export interface RadioFieldProps
  extends ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Item> {
  label: string;
}

export function RadioField({ label, id, className, ...props }: RadioFieldProps) {
  return (
    <label className={cn(optionLabel, className)} htmlFor={id}>
      <Radio id={id} {...props} />
      <span>{label}</span>
    </label>
  );
}
