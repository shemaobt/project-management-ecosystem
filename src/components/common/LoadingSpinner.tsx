import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../utils/cn";

const spinnerVariants = cva(
  "animate-spin rounded-pill border-2 border-line border-t-telha",
  {
    variants: {
      size: {
        sm: "size-4",
        md: "size-6",
        lg: "size-8",
      },
    },
    defaultVariants: {
      size: "md",
    },
  },
);

export interface LoadingSpinnerProps
  extends VariantProps<typeof spinnerVariants> {
  label: string;
  className?: string;
}

export function LoadingSpinner({ label, size, className }: LoadingSpinnerProps) {
  return (
    <span role="status" className={cn("inline-flex items-center gap-2", className)}>
      <span aria-hidden className={spinnerVariants({ size })} />
      <span className="sr-only">{label}</span>
    </span>
  );
}
