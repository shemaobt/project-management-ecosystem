import type { SensitiveCountry } from "../../../types/access";

/**
 * The Admin's list of sensitive countries as the editor holds it (OBT-616): one row per country,
 * its other spellings typed as one line separated by commas — the separator the place itself is
 * split on, so a spelling can never hold one.
 */
export interface SensitiveRow {
  key: string;
  name: string;
  spellings: string;
}

export function rowsOf(countries: readonly SensitiveCountry[]): SensitiveRow[] {
  return countries.map((country, index) => ({
    key: `listed-${index}`,
    name: country.name,
    spellings: country.spellings.join(", "),
  }));
}

/**
 * The rows as the server takes them: names and spellings trimmed, blank spellings and repeats
 * dropped, and a row with no name left out — an empty line is not a country. What the server
 * refuses (one spelling for two countries) it refuses with a sentence, shown as it came.
 */
export function listOfRows(rows: readonly SensitiveRow[]): SensitiveCountry[] {
  return rows
    .map((row) => ({
      name: row.name.trim(),
      spellings: [
        ...new Set(
          row.spellings
            .split(",")
            .map((spelling) => spelling.trim())
            .filter(Boolean),
        ),
      ],
    }))
    .filter((country) => country.name !== "");
}

export function sameList(
  rows: readonly SensitiveRow[],
  saved: readonly SensitiveCountry[],
): boolean {
  return JSON.stringify(listOfRows(rows)) === JSON.stringify(listOfRows(rowsOf(saved)));
}
