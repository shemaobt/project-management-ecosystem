import type { RecordTabProps } from "../types";
import { PendingWriteNote } from "../PendingWriteNote";
import { NecessidadesForm } from "./necessidades/NecessidadesForm";
import { NecessidadesView } from "./necessidades/NecessidadesView";

export function NecessidadesTab({ mode, draft }: RecordTabProps) {
  if (mode !== "editar") return <NecessidadesView draft={draft} />;
  return (
    <div className="flex flex-col gap-5">
      <PendingWriteNote tab="necessidades" />
      <NecessidadesForm draft={draft} />
    </div>
  );
}
