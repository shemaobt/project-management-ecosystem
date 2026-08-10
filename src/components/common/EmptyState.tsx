import type { ReactNode } from "react";
import { cn } from "../../utils/cn";

export interface EmptyStateProps {
  message: string;
  title?: string;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({
  message,
  title,
  icon,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "rounded-lg border-2 border-dashed border-line px-8 py-16 text-center text-fg-muted",
        className,
      )}
    >
      {icon ? (
        <div className="mb-3 flex justify-center text-fg-subtle">{icon}</div>
      ) : null}
      {title ? (
        <h3 className="mb-1.5 font-serif text-h4 font-normal italic text-fg">
          {title}
        </h3>
      ) : null}
      <p className={cn(action && "mb-5")}>{message}</p>
      {action}
    </div>
  );
}
