import type { ReactNode } from "react";
import { titleText } from "../../styles";
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
        "flex flex-col items-center gap-3 px-6 py-12 text-center",
        className,
      )}
    >
      {icon ? <span className="text-fg-subtle">{icon}</span> : null}
      {title ? (
        <p className={titleText}>{title}</p>
      ) : null}
      <p className="max-w-(--container-narrow) font-serif text-[15px] leading-body italic text-fg-muted">
        {message}
      </p>
      {action}
    </div>
  );
}
