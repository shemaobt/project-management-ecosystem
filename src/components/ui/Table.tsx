import type {
  HTMLAttributes,
  TdHTMLAttributes,
  ThHTMLAttributes,
} from "react";
import { cn } from "../../utils/cn";

export function Table({
  className,
  ...props
}: HTMLAttributes<HTMLTableElement>) {
  return (
    <div className="overflow-x-auto rounded-md border border-line bg-elevated">
      <table
        className={cn("w-full border-collapse text-left", className)}
        {...props}
      />
    </div>
  );
}

export function TableHead({
  className,
  ...props
}: HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <thead
      className={cn("border-b border-line bg-muted", className)}
      {...props}
    />
  );
}

export function TableBody({
  className,
  ...props
}: HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className={className} {...props} />;
}

export function TableFoot({
  className,
  ...props
}: HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <tfoot
      className={cn(
        "bg-inverse text-on-dark [&_td]:text-on-dark [&_td]:font-bold",
        className,
      )}
      {...props}
    />
  );
}

export function TableRow({
  className,
  ...props
}: HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr
      className={cn(
        "border-b border-line transition-colors duration-[140ms] ease-out last:border-b-0 hover:bg-muted",
        className,
      )}
      {...props}
    />
  );
}

export interface TableCellProps extends TdHTMLAttributes<HTMLTableCellElement> {
  numeric?: boolean;
}

export function TableCell({ className, numeric, ...props }: TableCellProps) {
  return (
    <td
      className={cn(
        "px-4.5 py-3 text-small text-fg",
        numeric && "text-right tabular-nums text-fg-muted",
        className,
      )}
      {...props}
    />
  );
}

export interface TableHeaderCellProps
  extends ThHTMLAttributes<HTMLTableCellElement> {
  numeric?: boolean;
}

export function TableHeaderCell({
  className,
  numeric,
  ...props
}: TableHeaderCellProps) {
  return (
    <th
      scope="col"
      className={cn(
        "px-4.5 py-3 text-[10px] font-bold tracking-[0.12em] text-fg-subtle uppercase",
        numeric && "text-right",
        className,
      )}
      {...props}
    />
  );
}
