import type { TFunction } from "i18next";
import type { EtenReading, EtenYearSnapshot } from "../../../types/eten";
import type { LocationDisplay } from "../../../types/region";
import { formatDate, utcDay } from "../../../utils/format";

/**
 * What sits under a language on this report: the country, or the region the server put in its
 * place. The report is a document that leaves (§6.1) — the line carries no base and the screen
 * rebuilds no place from anything else.
 */
export function locationLabel(country: LocationDisplay, t: TFunction): string {
  return country.withheld ? t(country.regionLabelKey) : country.location;
}

/**
 * Where a year-end count was read, in words: the day of the progress entry, the record as it
 * stood when the report was computed, or no reading at all. The table and the breakdown say it
 * the same way because both read it from here.
 */
export function readingLabel(reading: EtenReading | null, t: TFunction): string {
  if (reading === null) return t("eten_reading_none");
  if (reading.source === "live" || reading.date === null) {
    return t("eten_reading_live");
  }
  return t("eten_reading_on", { date: formatDate(reading.date) });
}

/** Who set a manual figure and when, as far as the ledger recorded it. */
export function manualLabel(snapshot: EtenYearSnapshot, t: TFunction): string {
  const entry = snapshot.manualEntry;
  if (!entry?.recordedBy) return t("eten_source_manual");
  const day = entry.recordedAt ? utcDay(entry.recordedAt) : "";
  return day
    ? t("eten_manual_by", { name: entry.recordedBy, date: formatDate(day) })
    : t("eten_manual_by_undated", { name: entry.recordedBy });
}

/**
 * Why a line earned what it earned — the path from the total down to the event. A manual figure
 * names who set it; a stamped completion names its day; otherwise the two readings the scope was
 * crossed between.
 */
export function creditReason(snapshot: EtenYearSnapshot, t: TFunction): string {
  if (snapshot.creditsSource === "manual") return manualLabel(snapshot, t);
  if (snapshot.completionSource === "completedDate" && snapshot.completedDate) {
    return t("eten_why_completed", {
      scope: snapshot.scopeUnits,
      date: formatDate(snapshot.completedDate),
    });
  }
  return t("eten_why_crossed", {
    scope: snapshot.scopeUnits,
    start: snapshot.approvedAtStart,
    from: readingLabel(snapshot.startReading, t),
    end: snapshot.approvedAtEnd,
    to: readingLabel(snapshot.endReading, t),
  });
}
