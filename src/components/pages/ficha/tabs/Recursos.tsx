import type { RecordTabProps } from "../types";
import { RecursosForm } from "./recursos/RecursosForm";
import { RecursosView } from "./recursos/RecursosView";

export function RecursosTab({ mode, draft }: RecordTabProps) {
  return mode === "editar" ? (
    <RecursosForm draft={draft} />
  ) : (
    <RecursosView draft={draft} />
  );
}
