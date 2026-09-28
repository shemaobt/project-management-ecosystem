import { useId, type ReactNode } from "react";
import { cn } from "../../../utils/cn";
import { cardVariants } from "../../ui";

export interface PanelProps {
  title: string;
  lead?: string;
  id?: string;
  children: ReactNode;
}

export function Panel({ title, lead, id, children }: PanelProps) {
  const headingId = useId();

  return (
    <section
      id={id}
      aria-labelledby={headingId}
      className={cn(cardVariants({ variant: "soft", padding: "lg" }), "sm:p-7")}
    >
      <h2
        id={headingId}
        className="text-h4 leading-snug font-bold tracking-tight text-fg-strong"
      >
        {title}
      </h2>
      {lead ? (
        <p className="mt-1.5 max-w-[68ch] text-small leading-normal text-fg-muted">
          {lead}
        </p>
      ) : null}
      <div className="mt-5">{children}</div>
    </section>
  );
}
