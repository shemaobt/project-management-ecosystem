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
 * `readsHealth`: the pastoral follow-up. Whether the reader is in the health audience
 * comes from the session's roles (`canReadHealth`), handed in by whoever builds this.
 */
export interface RecordAccess {
  withheld: boolean;
  placeWritable: boolean;
  baseWritable: boolean;
  readsHealth: boolean;
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
};

const NO_ACCESS: RecordAccess = {
  withheld: true,
  placeWritable: false,
  baseWritable: false,
  readsHealth: false,
};

/**
 * `readsHealth` is the reader's own, on a new record too: a creator is not refused, but
 * the Saúde tab is not theirs to see, so there is nothing for them to type there.
 */
export function recordAccess(
  saved: Project | undefined,
  isNew: boolean,
  readsHealth: boolean,
): RecordAccess {
  if (isNew) return { ...FULL_ACCESS, readsHealth };
  if (!saved) return NO_ACCESS;
  const coordination = saved.readAs === "coordination";
  return {
    withheld: getLocationDisplay(saved).withheld,
    placeWritable: coordination,
    baseWritable: coordination || !saved.sensitiveCountry,
    readsHealth,
  };
}

export function mayWrite(access: RecordAccess, field: RecordField): boolean {
  if (COORDINATION_WRITES.has(field)) return access.placeWritable;
  if (WITHHELD_WRITES.has(field)) return access.baseWritable;
  if (PASTORAL_WRITES.has(field)) return access.readsHealth;
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
  return !saved || access.baseWritable;
}
