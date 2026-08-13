import type { RecordTabProps } from "../types";
import { NotasForm } from "./notas/NotasForm";
import { NotasView } from "./notas/NotasView";

export function NotasTab({ mode, draft }: RecordTabProps) {
  return mode === "editar" ? (
    <NotasForm draft={draft} />
  ) : (
    <NotasView draft={draft} />
  );
}
