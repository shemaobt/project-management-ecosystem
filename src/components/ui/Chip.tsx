import { cva, type VariantProps } from "class-variance-authority";
import type {
  ButtonHTMLAttributes,
  ComponentPropsWithoutRef,
  ReactNode,
} from "react";
import { cn } from "../../utils/cn";
import { surfaceOutlined, transitionAll } from "../../styles";
import { RadioButton } from "./RadioGroup";

const chipVariants = cva(
  `inline-flex items-center ${transitionAll} disabled:pointer-events-none disabled:opacity-40`,
  {
    variants: {
      variant: {
        filter:
          "w-full justify-between gap-1.5 rounded-sm px-2.5 py-1.5 text-micro font-medium text-fg hover:bg-telha/6 hover:text-telha data-[state=checked]:bg-inverse data-[state=checked]:font-semibold data-[state=checked]:text-on-dark",
        outline: `gap-1.75 rounded-pill ${surfaceOutlined} px-3.5 py-2.25 text-[13px] leading-none font-semibold text-fg data-[state=checked]:border-telha data-[state=checked]:bg-telha data-[state=checked]:text-on-brand`,
      },
    },
    defaultVariants: {
      variant: "filter",
    },
  },
);

const countVariants = cva("rounded-pill tabular-nums", {
  variants: {
    variant: {
      filter:
        "bg-verde/8 px-1.75 py-0.5 text-[10px] font-semibold text-fg-muted group-data-[state=checked]:bg-branco/20 group-data-[state=checked]:text-on-dark",
      outline:
        "text-[11px] font-bold text-fg-subtle group-data-[state=checked]:text-on-brand/80",
    },
  },
  defaultVariants: {
    variant: "filter",
  },
});

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
      data-state={active ? "checked" : "unchecked"}
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

export interface ChipRadioProps
  extends Omit<ComponentPropsWithoutRef<typeof RadioButton>, "children">,
    VariantProps<typeof chipVariants> {
  label: ReactNode;
  count?: number;
}

export function ChipRadio({
  className,
  variant = "outline",
  label,
  count,
  ...props
}: ChipRadioProps) {
  return (
    <RadioButton
      className={cn("group", chipVariants({ variant }), className)}
      {...props}
    >
      <span>{label}</span>
      {count !== undefined ? (
        <span className={countVariants({ variant })}>{count}</span>
      ) : null}
    </RadioButton>
  );
}
