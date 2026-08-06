import { cva, type VariantProps } from "class-variance-authority";
import type { HTMLAttributes } from "react";
import { cn } from "../../utils/cn";
import { goodTone } from "../../styles";

export const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-pill font-semibold tracking-button",
  {
    variants: {
      tone: {
        neutral: "bg-muted text-verde",
        accent: "bg-accent-soft text-telha",
        green: goodTone,
        azul: "bg-azul/25 text-azul",
        dark: "bg-inverse text-on-dark",
      },
      size: {
        sm: "px-2.5 py-1 text-tag",
        md: "px-3 py-1.25 text-micro",
      },
      uppercase: {
        true: "uppercase",
      },
    },
    defaultVariants: {
      tone: "neutral",
      size: "sm",
    },
  },
);

export interface BadgeProps
  extends HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({
  className,
  tone,
  size,
  uppercase,
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(badgeVariants({ tone, size, uppercase }), className)}
      {...props}
    />
  );
}
