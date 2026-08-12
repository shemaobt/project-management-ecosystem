import type { RecordTabProps } from "../types";
import { MidiaForm } from "./midia/MidiaForm";
import { MidiaView } from "./midia/MidiaView";

export function MidiaTab({ mode, draft }: RecordTabProps) {
  return mode === "editar" ? (
    <MidiaForm draft={draft} />
  ) : (
    <MidiaView draft={draft} />
  );
}
