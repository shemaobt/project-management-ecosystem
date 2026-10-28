export type SensitiveMark = "country" | "project" | "listedUnsaved" | "none";

/**
 * Why a project is sensitive (OBT-616), read off the flag and the server's `listedCountries`.
 * Only a reader of the truth is told, and only once the server has answered for the saved place:
 * the `[]` it sends everybody else means *not told*, and a record not yet saved has no answer —
 * reading either as the project's own mark would say something false about the country.
 */
export function sensitiveMark(
  flagged: boolean,
  listed: readonly string[] | undefined,
  readsTruth: boolean,
): SensitiveMark {
  if (!readsTruth || listed === undefined) return "none";
  const named = listed.length > 0;
  if (flagged) return named ? "country" : "project";
  return named ? "listedUnsaved" : "none";
}

export function listedNames(listed: readonly string[] | undefined): string {
  return (listed ?? []).join(", ");
}
