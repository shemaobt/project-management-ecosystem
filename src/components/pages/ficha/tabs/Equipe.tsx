import type { RecordTabProps } from "../types";
import { EquipeForm } from "./equipe/EquipeForm";
import { EquipeView } from "./equipe/EquipeView";

export function EquipeTab({ mode, draft }: RecordTabProps) {
  return mode === "editar" ? (
    <EquipeForm draft={draft} />
  ) : (
    <EquipeView draft={draft} />
  );
}
