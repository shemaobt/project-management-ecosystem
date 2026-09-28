import {
  COORDINATION_WRITES,
  WITHHELD_WRITES,
} from "../constants/recordFields";
import type { Project } from "../types/project";
import type { RecordField } from "../types/projectRecord";
import { getLocationDisplay } from "./region";

/**
 * What the record's reader may see and write of its place — read off the server's
 * `readAs`, never off the session's roles (OBT-528, OBT-532).
 *
 * `withheld`: the place reads as its region, and the base and contacts arrive empty.
 * `placeWritable`: location, location 2, coordinates, the flag and the reason.
 * `baseWritable`: the base and the three contacts.
 */
export interface RecordAccess {
  withheld: boolean;
  placeWritable: boolean;
  baseWritable: boolean;
}

/**
 * Everything seen, everything written: coordination on any record, and whoever creates
 * one — the creator reads what they type, and the server does not refuse a create.
 */
export const FULL_ACCESS: RecordAccess = {
  withheld: false,
  placeWritable: true,
  baseWritable: true,
};

const NO_ACCESS: RecordAccess = {
  withheld: true,
  placeWritable: false,
  baseWritable: false,
};

export function recordAccess(
  saved: Project | undefined,
  isNew: boolean,
): RecordAccess {
  if (isNew) return FULL_ACCESS;
  if (!saved) return NO_ACCESS;
  const coordination = saved.readAs === "coordination";
  return {
    withheld: getLocationDisplay(saved).withheld,
    placeWritable: coordination,
    baseWritable: coordination || !saved.sensitiveCountry,
  };
}

export function mayWrite(access: RecordAccess, field: RecordField): boolean {
  if (COORDINATION_WRITES.has(field)) return access.placeWritable;
  if (WITHHELD_WRITES.has(field)) return access.baseWritable;
  return true;
}
