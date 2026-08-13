import type { RecordTabProps } from "../types";
import { MateriaisForm } from "./materiais/MateriaisForm";
import { MateriaisView } from "./materiais/MateriaisView";

export function MateriaisTab({ mode, draft }: RecordTabProps) {
  return mode === "editar" ? (
    <MateriaisForm draft={draft} />
  ) : (
    <MateriaisView draft={draft} />
  );
}
