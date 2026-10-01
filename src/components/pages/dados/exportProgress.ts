import type { TransferProgress } from "../../../services/api";
import type { ApiFailure } from "../../../types/session";

/** One export at a time, and what the dialog says about it (INT-11 · OBT-416). */
export type ExportRun =
  | { readonly status: "idle" }
  | { readonly status: "running"; readonly progress: TransferProgress }
  | { readonly status: "failed"; readonly failure: ApiFailure };

const KILOBYTE = 1024;

/** The size a person reads — the unit grows with the file, one decimal past a megabyte. */
export function readableSize(bytes: number): string {
  if (bytes < KILOBYTE * KILOBYTE) return `${Math.max(1, Math.round(bytes / KILOBYTE))} KB`;
  return `${(bytes / (KILOBYTE * KILOBYTE)).toFixed(1)} MB`;
}

/** `null` when the server did not say how big the file is — then only bytes are counted. */
export function progressPercent(progress: TransferProgress): number | null {
  if (progress.total === null) return null;
  return Math.min(100, Math.round((progress.loaded / progress.total) * 100));
}
