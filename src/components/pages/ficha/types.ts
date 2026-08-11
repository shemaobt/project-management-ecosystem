import type { DraftHandle } from "./useDraft";

export type RecordMode = "ver" | "editar";

export interface RecordTabProps {
  mode: RecordMode;
  draft: DraftHandle;
}
