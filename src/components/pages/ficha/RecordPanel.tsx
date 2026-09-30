import type { ReactNode } from "react";

export interface RecordPanelProps {
  icon: ReactNode;
  title: string;
  hint: string;
  action?: ReactNode;
  children: ReactNode;
}

export function RecordPanel({ icon, title, hint, action, children }: RecordPanelProps) {
  return (
    <section className="rounded-[12px] border border-line bg-muted px-4 py-3.5">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <h3 className="inline-flex items-center gap-1.5 text-[10px] font-bold tracking-[0.14em] uppercase text-fg-muted">
          {icon}
          {title}
        </h3>
        {action}
      </div>
      {children}
      <p className="mt-3 text-micro leading-[1.45] text-fg-subtle">{hint}</p>
    </section>
  );
}
