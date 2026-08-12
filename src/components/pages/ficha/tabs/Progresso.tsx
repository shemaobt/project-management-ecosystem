import type { RecordTabProps } from "../types";
import { ProgressoForm } from "./progresso/ProgressoForm";
import { ProgressoView } from "./progresso/ProgressoView";

export function ProgressoTab({ mode, draft }: RecordTabProps) {
  return mode === "editar" ? (
    <ProgressoForm draft={draft} />
  ) : (
    <ProgressoView draft={draft} />
  );
}
