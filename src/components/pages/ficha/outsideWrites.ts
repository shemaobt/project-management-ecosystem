import type { TFunction } from "i18next";
import { getRegionLabelKey } from "../../../utils/region";
import type { DraftHandle } from "./useDraft";

/**
 * The sentence the location field and the footer say when a new record's place falls outside
 * where the account writes (OBT-593): which region the place is in, and the ones it may file in.
 */
export function outsideWritesText(
  t: TFunction,
  outside: NonNullable<DraftHandle["outsideWrites"]>,
): string {
  return t("record_region_outside_writes", {
    region: t(getRegionLabelKey(outside.region)),
    regions: outside.writes.map((key) => t(getRegionLabelKey(key))).join(", "),
  });
}
