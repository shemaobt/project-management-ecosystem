import type { RecordTabProps } from "../types";
import { NecessidadesForm } from "./necessidades/NecessidadesForm";
import { NecessidadesView } from "./necessidades/NecessidadesView";

export function NecessidadesTab({ mode, draft }: RecordTabProps) {
  return mode === "editar" ? (
    <NecessidadesForm draft={draft} />
  ) : (
    <NecessidadesView draft={draft} />
  );
}
