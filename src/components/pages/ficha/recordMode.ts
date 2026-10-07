import type { RecordMode } from "./types";

/**
 * The mode the address asks for, unless the record is read-only for this reader (OBT-571:
 * the Resource Circle's `trusted` payload): then `?modo=editar` is still `ver`, so a saved
 * link or a typed address cannot open a form the server would refuse field by field.
 */
export function readMode(raw: string | null, isNew: boolean, readOnly: boolean): RecordMode {
  if (isNew) return "editar";
  if (readOnly) return "ver";
  return raw === "editar" ? "editar" : "ver";
}
