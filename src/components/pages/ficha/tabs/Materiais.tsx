import type { RecordTabProps } from "../types";
import { PendingWriteNote } from "../PendingWriteNote";
import { MateriaisForm } from "./materiais/MateriaisForm";
import { MateriaisView } from "./materiais/MateriaisView";

export function MateriaisTab({ mode, draft }: RecordTabProps) {
  if (mode !== "editar") return <MateriaisView draft={draft} />;
  return (
    <div className="flex flex-col gap-5">
      <PendingWriteNote tab="materiais" />
      <MateriaisForm draft={draft} />
    </div>
  );
}
