import type { TextareaHTMLAttributes } from "react";
import { cn } from "../../utils/cn";
import { fieldBase, fieldInvalid } from "./fieldStyles";

export interface TextareaProps
  extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean;
}

export function Textarea({ className, invalid, ...props }: TextareaProps) {
  return (
    <textarea
      aria-invalid={invalid || undefined}
      className={cn(
        fieldBase,
        "min-h-21 resize-y font-sans leading-body",
        invalid && fieldInvalid,
        className,
      )}
      {...props}
    />
  );
}
