import * as ProgressPrimitive from "@radix-ui/react-progress";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../utils/cn";

const trackVariants = cva("w-full overflow-hidden rounded-pill bg-verde/8", {
  variants: {
    size: {
      sm: "h-1",
      md: "h-1.5",
      lg: "h-2.5",
    },
  },
  defaultVariants: {
    size: "md",
  },
});

const fillVariants = cva(
  "h-full rounded-pill transition-[width] duration-(--duration-slow) ease-out",
  {
    variants: {
      tone: {
        translated: "bg-linear-to-r from-verde-claro to-telha",
        community: "bg-azul",
        approved: "bg-verde",
      },
    },
    defaultVariants: {
      tone: "translated",
    },
  },
);

export interface ProgressProps
  extends VariantProps<typeof trackVariants>,
    VariantProps<typeof fillVariants> {
  value: number;
  max?: number;
  label: string;
  className?: string;
}

export function Progress({
  value,
  max = 100,
  label,
  size,
  tone,
  className,
}: ProgressProps) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  const rootMax = max > 0 ? max : 100;
  const rootValue = Math.min(rootMax, Math.max(0, value));
  return (
    <ProgressPrimitive.Root
      value={rootValue}
      max={rootMax}
      aria-label={label}
      className={cn(trackVariants({ size }), className)}
    >
      <ProgressPrimitive.Indicator
        className={fillVariants({ tone })}
        style={{ width: `${pct}%` }}
      />
    </ProgressPrimitive.Root>
  );
}
