import type { RecordTabProps } from "../types";
import { SaudeForm } from "./saude/SaudeForm";
import { SaudeView } from "./saude/SaudeView";

export function SaudeTab({ mode, draft }: RecordTabProps) {
  return mode === "editar" ? (
    <SaudeForm draft={draft} />
  ) : (
    <SaudeView draft={draft} />
  );
}
