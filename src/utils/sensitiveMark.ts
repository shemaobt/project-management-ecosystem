/**
 * Why a project is sensitive — the one reading of OBT-616's two marks, for every screen that says it.
 *
 * Karina, via Daniel, 19/out/2026: a project is sensitive **by its country** when its place names a
 * country on the list the Admin keeps, and **by its own mark** when the country is not on the list
 * but the project is (the north of Brazil). The flag is one bit and keeps no provenance, so the
 * server sends, beside it, the listed countries the saved place names (`listedCountries`, only to a
 * reader of the truth), and this function reads the pair:
 *
 * - `country` — the flag is up and the place names a listed country: the list holds it, and the
 *   server raises it again on any save, so the box cannot lower it;
 * - `project` — the flag is up and the place names no listed country: the project's own mark, which
 *   coordination lowers as before;
 * - `listedUnsaved` — the place names a listed country and the flag is still down: a project stored
 *   before the list named its country, which the next save that changes something will mark — the
 *   rule runs on writes, never over stored rows (Daniel, 19/out/2026);
 * - `none` — neither.
 *
 * The list only raises the flag, never lowers it: a place moved off the list leaves a raised flag
 * that now reads `project`.
 */
export type SensitiveMark = "country" | "project" | "listedUnsaved" | "none";

export function sensitiveMark(
  flagged: boolean,
  listed: readonly string[] | undefined,
): SensitiveMark {
  const named = (listed ?? []).length > 0;
  if (flagged) return named ? "country" : "project";
  return named ? "listedUnsaved" : "none";
}

/** The listed countries as a sentence names them: `Índia, Irã`. */
export function listedNames(listed: readonly string[] | undefined): string {
  return (listed ?? []).join(", ");
}
