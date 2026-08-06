import { cva, type VariantProps } from "class-variance-authority";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "../../utils/cn";
import { surfaceOutlined, transitionAll } from "../../styles";

const chipVariants = cva(
  `inline-flex items-center gap-1.5 font-medium ${transitionAll} disabled:pointer-events-none disabled:opacity-40`,
  {
    variants: {
      variant: {
        filter:
          "w-full justify-between rounded-sm px-2.5 py-1.5 text-micro text-fg hover:bg-telha/6 hover:text-telha data-[active=true]:bg-inverse data-[active=true]:font-semibold data-[active=true]:text-on-dark",
        outline:
          `rounded-pill ${surfaceOutlined} px-3.5 py-2.25 text-[13px] font-semibold text-fg data-[active=true]:border-telha data-[active=true]:bg-telha data-[active=true]:text-branco`,
      },
    },
    defaultVariants: {
      variant: "filter",
    },
  },
);

const countVariants = cva(
  "rounded-pill text-[10px] font-semibold tabular-nums",
  {
    variants: {
      variant: {
        filter:
          "bg-verde/8 px-1.75 py-0.5 text-fg-muted group-data-[active=true]:bg-branco/20 group-data-[active=true]:text-branco",
        outline:
          "text-[11px] font-bold text-fg-subtle group-data-[active=true]:text-branco/80",
      },
    },
    defaultVariants: {
      variant: "filter",
    },
  },
);

export interface ChipProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children">,
    VariantProps<typeof chipVariants> {
  label: ReactNode;
  count?: number;
  active?: boolean;
}

export function Chip({
  className,
  variant,
  label,
  count,
  active = false,
  type = "button",
  ...props
}: ChipProps) {
  return (
    <button
      type={type}
      data-active={active}
      aria-pressed={active}
      className={cn("group", chipVariants({ variant }), className)}
      {...props}
    >
      <span>{label}</span>
      {count !== undefined ? (
        <span className={countVariants({ variant })}>{count}</span>
      ) : null}
    </button>
  );
}
