import type { ReactNode } from "react";
import { cn } from "../../utils/cn";

export type OutcomeTone = "attention" | "refused" | "quiet";

const TONES: Record<OutcomeTone, string> = {
  attention: "border-status-attention-fg bg-status-attention-bg",
  refused: "border-telha bg-accent-soft",
  quiet: "border-line-strong bg-muted",
};

export interface OutcomePanelProps {
  tone: OutcomeTone;
  title: string;
  children: ReactNode;
}

export function OutcomePanel({ tone, title, children }: OutcomePanelProps) {
  return (
    <div
      role="status"
      className={cn(
        "flex flex-col gap-2 rounded-md border-l-4 px-4.5 py-3.5 text-small leading-[1.45] text-fg",
        TONES[tone],
      )}
    >
      <strong className="font-semibold">{title}</strong>
      {children}
    </div>
  );
}
