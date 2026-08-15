import * as SwitchPrimitive from "@radix-ui/react-switch";
import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentPropsWithoutRef } from "react";
import { cn } from "../../utils/cn";

const switchVariants = cva(
  "relative inline-flex shrink-0 cursor-pointer items-center rounded-pill bg-verde/20 transition-colors duration-fast ease-out data-[state=checked]:bg-telha disabled:cursor-not-allowed disabled:opacity-50",
  {
    variants: {
      size: {
        default: "h-[22px] w-[38px]",
        lg: "h-[26px] w-[46px]",
      },
    },
    defaultVariants: {
      size: "default",
    },
  },
);

const switchThumbVariants = cva(
  "pointer-events-none block rounded-pill bg-elevated shadow-sm transition-transform duration-fast ease-out",
  {
    variants: {
      size: {
        default: "size-[18px] translate-x-[2px] data-[state=checked]:translate-x-[18px]",
        lg: "size-[22px] translate-x-[2px] data-[state=checked]:translate-x-[22px]",
      },
    },
    defaultVariants: {
      size: "default",
    },
  },
);

export interface SwitchProps
  extends ComponentPropsWithoutRef<typeof SwitchPrimitive.Root>,
    VariantProps<typeof switchVariants> {}

export function Switch({ className, size, ...props }: SwitchProps) {
  return (
    <SwitchPrimitive.Root
      className={cn(switchVariants({ size }), className)}
      {...props}
    >
      <SwitchPrimitive.Thumb className={switchThumbVariants({ size })} />
    </SwitchPrimitive.Root>
  );
}
