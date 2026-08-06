import type { InputHTMLAttributes } from "react";
import { cn } from "../../utils/cn";
import { fieldBase, fieldInvalid } from "./fieldStyles";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
}

export function Input({ className, invalid, ...props }: InputProps) {
  return (
    <input
      aria-invalid={invalid || undefined}
      className={cn(fieldBase, invalid && fieldInvalid, className)}
      {...props}
    />
  );
}
