import {
  COORDINATION_WRITES,
  PASTORAL_WRITES,
  WITHHELD_WRITES,
} from "../constants/recordFields";
import type { Project } from "../types/project";
import type { RecordField } from "../types/projectRecord";
import { getLocationDisplay } from "./region";

/**
 * What the record's reader may see and write of its place — read off the server's
 * `readAs`, never off the session's roles (OBT-528, OBT-532) — and of a team's health,
 * which is the one thing the server does not stamp on the payload (OBT-553).
 *
 * `withheld`: the place reads as its region, and the base and contacts arrive empty.
 * `placeWritable`: location, location 2, coordinates, the flag and the reason.
 * `baseWritable`: the base, the three contacts, the language's name and, on a withheld
 * record, the free text (OBT-556) and the description of a saved need.
 * `readsHealth`: the Saúde tab and the health fields. `writesHealth`: the pastoral
 * follow-up — narrower since OBT-571, because the Resource Circle reads the health and
 * writes none of it. Both come from the session's roles (`canReadHealth`,
 * `canWriteHealth`), handed in by whoever builds this.
 *
 * A `trusted` payload (OBT-571) reads the truth of a sensitive place like coordination and
 * writes **nothing** — Daniel, 7/oct/2026: the Resource Circle loses the `PATCH` it had, the
 * description of a need included. `readOnly` is that bit, and `mayWrite` answers it first.
 */
export interface RecordAccess {
  withheld: boolean;
  placeWritable: boolean;
  baseWritable: boolean;
  readsHealth: boolean;
  writesHealth: boolean;
  readOnly: boolean;
}

/**
 * Everything seen, everything written: coordination on any record, and whoever creates
 * one — the creator reads what they type, and the server does not refuse a create.
 */
export const FULL_ACCESS: RecordAccess = {
  withheld: false,
  placeWritable: true,
  baseWritable: true,
  readsHealth: true,
  writesHealth: true,
  readOnly: false,
};

const NO_ACCESS: RecordAccess = {
  withheld: true,
  placeWritable: false,
  baseWritable: false,
  readsHealth: false,
  writesHealth: false,
  readOnly: true,
};

/**
 * `readsHealth` is the reader's own, on a new record too: a creator is not refused, but
 * the Saúde tab is not theirs to see, so there is nothing for them to type there.
 */
export function recordAccess(
  saved: Project | undefined,
  isNew: boolean,
  readsHealth: boolean,
  writesHealth: boolean,
): RecordAccess {
  if (isNew) return { ...FULL_ACCESS, readsHealth, writesHealth };
  if (!saved) return NO_ACCESS;
  const coordination = saved.readAs === "coordination";
  const readOnly = saved.readAs === "trusted";
  return {
    withheld: getLocationDisplay(saved).withheld,
    placeWritable: coordination,
    baseWritable: !readOnly && (coordination || !saved.sensitiveCountry),
    readsHealth,
    writesHealth: writesHealth && !readOnly,
    readOnly,
  };
}

/**
 * Whether the reader was handed the free text — notes, the health notes, the status comments,
 * the scope details, a saved need's description — or `""` in its place. The server empties
 * them on a **withheld** record for whoever does not read the truth (OBT-556), and `withheld`
 * is exactly that bit; a `trusted` reader (OBT-571) is handed them whole. A view asks this,
 * never `mayWrite`: that one is the write channel and answers `readOnly` first, so the Circle
 * — who reads everything and writes nothing — would read every note as *coordination only*.
 */
export function readsFreeText(access: RecordAccess): boolean {
  return !access.withheld;
}

export function mayWrite(access: RecordAccess, field: RecordField): boolean {
  if (access.readOnly) return false;
  if (COORDINATION_WRITES.has(field)) return access.placeWritable;
  if (WITHHELD_WRITES.has(field)) return access.baseWritable;
  if (PASTORAL_WRITES.has(field)) return access.writesHealth;
  return true;
}

/**
 * Whether a **saved** need's description may be typed over — `needsItems.description` on
 * the server (OBT-556). The console sends the whole list on every save, so a description
 * a withheld reader received as `""` and hands back as `""` reads as "not changed" and
 * leaves the text intact; one typed over it is a 403. A need that is not saved yet is the
 * creator's own and stays free.
 */
export function mayWriteNeedDescription(
  access: RecordAccess,
  saved: boolean,
): boolean {
  if (access.readOnly) return false;
  return !saved || access.baseWritable;
}

/**
 * Whether a **saved** story's recording place may be typed over —
 * `storyProgress.recordLocation` on the server (OBT-573). The progress tab sends the story
 * table whole, so a place a withheld reader received as `""` and hands back as `""` keeps the
 * stored one, and one typed over it is a 403. The server matches a row to a saved story by its
 * name, and so does `saved` here; a story with a new name is its author's own.
 */
export function mayWriteStoryPlace(
  access: RecordAccess,
  saved: boolean,
): boolean {
  return mayWriteNeedDescription(access, saved);
}
