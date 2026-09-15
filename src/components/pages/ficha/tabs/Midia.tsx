import type { RecordTabProps } from "../types";
import { PendingWriteNote } from "../PendingWriteNote";
import { MidiaForm } from "./midia/MidiaForm";
import { MidiaView } from "./midia/MidiaView";

export function MidiaTab({ mode, draft }: RecordTabProps) {
  if (mode !== "editar") return <MidiaView draft={draft} />;
  return (
    <div className="flex flex-col gap-5">
      <PendingWriteNote tab="midia" />
      <MidiaForm draft={draft} />
    </div>
  );
}
