import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import type { ButtonHTMLAttributes } from "react";
import { cn } from "../../utils/cn";
import { disabledControl, transitionAll } from "../../styles";

export const buttonVariants = cva(
  `inline-flex items-center justify-center gap-1.5 rounded-pill border border-transparent font-bold uppercase tracking-[0.08em] ${transitionAll} ${disabledControl}`,
  {
    variants: {
      variant: {
        primary: "bg-telha text-branco hover:bg-accent-hover",
        secondary:
          "border-line bg-elevated text-verde hover:border-verde hover:text-verde",
        green: "bg-verde-claro text-branco hover:bg-verde",
        danger:
          "border-status-critical-line bg-transparent text-telha hover:bg-accent-soft",
        ghost: "bg-transparent text-fg-muted hover:bg-muted hover:text-verde",
      },
      size: {
        sm: "px-3.5 py-2 text-micro",
        md: "px-4.5 py-2.5 text-micro",
        lg: "px-6 py-3 text-small",
      },
      block: {
        true: "w-full",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  },
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export function Button({
  className,
  variant,
  size,
  block,
  asChild = false,
  type = "button",
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      type={asChild ? undefined : type}
      className={cn(buttonVariants({ variant, size, block }), className)}
      {...props}
    />
  );
}
