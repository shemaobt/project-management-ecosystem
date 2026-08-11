import type { ReactNode } from "react";
import { cn } from "../../../utils/cn";
import { Label } from "../../ui";

const LABEL = "text-[11px] font-bold tracking-[0.1em] uppercase text-fg-muted";

export function FieldGrid({ children }: { children: ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-x-4.5 gap-y-3.5 sm:grid-cols-2">
      {children}
    </div>
  );
}

export interface FieldProps {
  id: string;
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
  full?: boolean;
  children: ReactNode;
}

export function Field({
  id,
  label,
  required,
  hint,
  error,
  full,
  children,
}: FieldProps) {
  return (
    <div className={cn("flex flex-col gap-1.5", full && "sm:col-span-2")}>
      <Label htmlFor={id} className={LABEL}>
        {label}
        {required && (
          <span aria-hidden className="ml-1 text-telha">
            *
          </span>
        )}
      </Label>
      {children}
      {error ? (
        <span
          id={`${id}-erro`}
          role="alert"
          className="text-micro font-semibold text-telha"
        >
          {error}
        </span>
      ) : (
        hint && (
          <span id={`${id}-dica`} className="text-micro text-fg-subtle">
            {hint}
          </span>
        )
      )}
    </div>
  );
}

export interface DetailItemProps {
  label: string;
  full?: boolean;
  serif?: boolean;
  children: ReactNode;
}

export function DetailItem({ label, full, serif, children }: DetailItemProps) {
  return (
    <div className={cn(full && "sm:col-span-2")}>
      <div className="mb-1 text-[10px] font-bold tracking-[0.14em] uppercase text-fg-muted">
        {label}
      </div>
      <div
        className={cn(
          "text-[15px] leading-[1.4] text-fg",
          serif ? "font-serif italic" : "font-medium",
        )}
      >
        {children}
      </div>
    </div>
  );
}
