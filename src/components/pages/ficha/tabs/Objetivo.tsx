import type { RecordTabProps } from "../types";
import { ObjetivoForm } from "./objetivo/ObjetivoForm";
import { ObjetivoView } from "./objetivo/ObjetivoView";

export function ObjetivoTab({ mode, draft }: RecordTabProps) {
  return mode === "editar" ? (
    <ObjetivoForm draft={draft} />
  ) : (
    <ObjetivoView draft={draft} />
  );
}
