import type { RecordTabProps } from "../types";
import { IdentidadeForm } from "./identidade/IdentidadeForm";
import { IdentidadeView } from "./identidade/IdentidadeView";

export function IdentidadeTab({ mode, draft }: RecordTabProps) {
  return mode === "editar" ? (
    <IdentidadeForm draft={draft} />
  ) : (
    <IdentidadeView draft={draft} />
  );
}
