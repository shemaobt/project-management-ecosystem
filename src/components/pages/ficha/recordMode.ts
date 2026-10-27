import type { RecordTabId } from "../../../constants/recordTabs";
import type { RecordField } from "../../../types/projectRecord";
import type { SessionRole } from "../../../types/session";
import { canCreateProjects } from "../../../utils/access";
import type { RecordMode } from "./types";

export const MODE_PARAM = "modo";

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

/**
 * Whether `/ficha/novo` opens for this reader at all. The header already hides *Novo projeto*
 * from a Resource Circle that does not coordinate (OBT-571), but a typed or saved address
 * reached the whole form anyway — `isNew` comes before `readOnly` and opens `FULL_ACCESS` —
 * and the server refused only at the save, after everything was typed. Same case `readMode`
 * closes for `?modo=editar`; a record that is not new is the server's to answer.
 */
export function mayOpenRecord(isNew: boolean, roles: readonly SessionRole[]): boolean {
  return !isNew || canCreateProjects(roles);
}

/**
 * Where a create whose answer was lost takes the reader once the record it filed is read
 * (OBT-625): that record, on the tab they were on — editing only when the draft holds a
 * difference to apply, because with nothing left there is nothing to edit.
 */
export function landedAddress(
  id: string,
  tab: RecordTabId,
  pending: readonly RecordField[],
): string {
  const mode = pending.length > 0 ? `?${MODE_PARAM}=editar` : "";
  return `/ficha/${id}/${tab}${mode}`;
}
