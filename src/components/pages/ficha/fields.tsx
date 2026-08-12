import type { ReactNode } from "react";
import type { VariantProps } from "class-variance-authority";
import { cn } from "../../../utils/cn";
import { optionsBox } from "../../../styles";
import { Badge, badgeVariants, CheckboxField, Label } from "../../ui";

const LABEL = "text-[11px] font-bold tracking-[0.1em] uppercase text-fg-muted";

export function FieldGrid({ children }: { children: ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-x-4.5 gap-y-3.5 sm:grid-cols-2">
      {children}
    </div>
  );
}

function messageId(id: string, error?: string, hint?: string) {
  return error ? `${id}-erro` : hint ? `${id}-dica` : undefined;
}

function RequiredMark() {
  return (
    <span aria-hidden className="ml-1 text-telha">
      *
    </span>
  );
}

function FieldMessages({
  id,
  error,
  hint,
  className,
}: {
  id: string;
  error?: string;
  hint?: string;
  className?: string;
}) {
  if (error) {
    return (
      <span
        id={`${id}-erro`}
        role="alert"
        className={cn("text-micro font-semibold text-telha", className)}
      >
        {error}
      </span>
    );
  }
  if (hint) {
    return (
      <span
        id={`${id}-dica`}
        className={cn("text-micro text-fg-subtle", className)}
      >
        {hint}
      </span>
    );
  }
  return null;
}

export interface FieldControlProps {
  id: string;
  "aria-describedby": string | undefined;
}

export interface FieldProps {
  id: string;
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
  full?: boolean;
  children: (control: FieldControlProps) => ReactNode;
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
        {required && <RequiredMark />}
      </Label>
      {children({ id, "aria-describedby": messageId(id, error, hint) })}
      <FieldMessages id={id} error={error} hint={hint} />
    </div>
  );
}

export interface FieldGroupProps {
  id: string;
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
  full?: boolean;
  children: ReactNode;
}

export function FieldGroup({
  id,
  label,
  required,
  hint,
  error,
  full,
  children,
}: FieldGroupProps) {
  return (
    <fieldset
      id={id}
      aria-describedby={messageId(id, error, hint)}
      aria-invalid={error ? true : undefined}
      className={cn("min-w-0", full && "sm:col-span-2")}
    >
      <legend className={cn(LABEL, "mb-1.5")}>
        {label}
        {required && <RequiredMark />}
      </legend>
      {children}
      <FieldMessages id={id} error={error} hint={hint} className="mt-1.5 block" />
    </fieldset>
  );
}

export interface CheckboxGroupProps<T extends string> {
  idPrefix: string;
  options: readonly T[];
  selected: readonly T[];
  onChange: (next: T[]) => void;
}

export function CheckboxGroup<T extends string>({
  idPrefix,
  options,
  selected,
  onChange,
}: CheckboxGroupProps<T>) {
  const toggle = (option: T) =>
    onChange(
      selected.includes(option)
        ? selected.filter((value) => value !== option)
        : [...selected, option],
    );

  return (
    <div className={cn(optionsBox, "gap-x-2.5 gap-y-1.5")}>
      {options.map((option, index) => (
        <CheckboxField
          key={option}
          id={`${idPrefix}-${index}`}
          label={option}
          checked={selected.includes(option)}
          onCheckedChange={() => toggle(option)}
        />
      ))}
    </div>
  );
}

type TagTone = VariantProps<typeof badgeVariants>["tone"];

export interface TagRowProps {
  values: readonly string[];
  tone?: TagTone;
}

export function TagRow({ values, tone = "accent" }: TagRowProps) {
  if (values.length === 0) return <>—</>;
  return (
    <div className="flex flex-wrap gap-1.5">
      {values.map((value) => (
        <Badge key={value} tone={tone}>
          {value}
        </Badge>
      ))}
    </div>
  );
}

export function NotesPanel({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-md border-l-[3px] border-areia bg-muted px-5 py-4 font-serif text-small font-normal italic leading-[1.5] whitespace-pre-wrap text-fg">
      {children}
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
