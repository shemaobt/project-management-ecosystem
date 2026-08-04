import { cva, type VariantProps } from "class-variance-authority";
import type { HTMLAttributes } from "react";
import { cn } from "../../utils/cn";
import {
  footerRow,
  headerRow,
  surfaceElevated,
  surfaceOutlined,
  titleText,
} from "../../styles";

export const cardVariants = cva("bg-elevated", {
  variants: {
    variant: {
      elevated: `rounded-md ${surfaceElevated}`,
      outlined: `rounded-md ${surfaceOutlined}`,
      soft: `rounded-lg ${surfaceElevated}`,
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
      className={cn(headerRow, "gap-3", className)}
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
      className={cn(titleText, className)}
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
      className={cn(footerRow, className)}
      {...props}
    />
  );
}
