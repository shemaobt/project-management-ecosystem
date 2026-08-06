import { cva, type VariantProps } from "class-variance-authority";
import type { HTMLAttributes } from "react";
import { cn } from "../../utils/cn";

export const cardVariants = cva("bg-elevated", {
  variants: {
    variant: {
      elevated: "rounded-md shadow-card",
      outlined: "rounded-md border border-line",
      soft: "rounded-lg shadow-card",
      paper: "rounded-[2px] bg-paper shadow-paper",
    },
    padding: {
      none: "",
      sm: "p-4",
      md: "px-5.5 py-4.5",
      lg: "p-5.5",
    },
    interactive: {
      true: "cursor-pointer transition-all duration-[180ms] ease-out",
    },
  },
  compoundVariants: [
    {
      variant: "outlined",
      interactive: true,
      class: "hover:-translate-y-px hover:border-telha hover:shadow-card",
    },
    {
      variant: "soft",
      interactive: true,
      class: "hover:-translate-y-0.75 hover:shadow-md",
    },
    {
      variant: "elevated",
      interactive: true,
      class: "hover:-translate-y-px hover:shadow-md",
    },
    {
      variant: "paper",
      interactive: true,
      class: "hover:-translate-y-1 hover:shadow-paper-hover",
    },
  ],
  defaultVariants: {
    variant: "elevated",
    padding: "md",
  },
});

export interface CardProps
  extends HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {}

export function Card({
  className,
  variant,
  padding,
  interactive,
  ...props
}: CardProps) {
  return (
    <div
      className={cn(
        cardVariants({ variant, padding, interactive }),
        className,
      )}
      {...props}
    />
  );
}

export function CardHeader({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("flex items-start justify-between gap-3", className)}
      {...props}
    />
  );
}

export function CardTitle({
  className,
  ...props
}: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn("text-h4 font-semibold text-fg-strong", className)}
      {...props}
    />
  );
}

export function CardBody({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex flex-col gap-3", className)} {...props} />;
}

export function CardFooter({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("flex items-center justify-between gap-2.5", className)}
      {...props}
    />
  );
}
