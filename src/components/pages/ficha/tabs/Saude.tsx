import type { RecordTabProps } from "../types";
import { PendingWriteNote } from "../PendingWriteNote";
import { SaudeForm } from "./saude/SaudeForm";
import { SaudeView } from "./saude/SaudeView";

export function SaudeTab({ mode, draft }: RecordTabProps) {
  if (mode !== "editar") return <SaudeView draft={draft} />;
  return (
    <div className="flex flex-col gap-5">
      <PendingWriteNote tab="saude" />
      <SaudeForm draft={draft} />
    </div>
  );
}
