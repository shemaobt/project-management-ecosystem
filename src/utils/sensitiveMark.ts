export type SensitiveMark = "country" | "project" | "listedUnsaved" | "none";

/**
 * Why a project is sensitive (OBT-616), read off the flag and the server's `listedCountries`.
 * Only a reader of the truth is told: the server sends `[]` to everybody else, which there means
 * *not told* and not *off the list*, so reading it as the project's own mark would say something
 * false about the country.
 */
export function sensitiveMark(
  flagged: boolean,
  listed: readonly string[] | undefined,
  readsTruth: boolean,
): SensitiveMark {
  if (!readsTruth) return "none";
  const named = (listed ?? []).length > 0;
  if (flagged) return named ? "country" : "project";
  return named ? "listedUnsaved" : "none";
}

export function listedNames(listed: readonly string[] | undefined): string {
  return (listed ?? []).join(", ");
}
