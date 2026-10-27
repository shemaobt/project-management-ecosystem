import type { SensitiveCountry } from "../../../types/access";

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
 * Only a row with nothing typed is left out. A row with spellings and no name goes to the server,
 * whose 422 the Admin reads — dropping it would take a country off the list with no word said.
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
    .filter((country) => country.name !== "" || country.spellings.length > 0);
}

export function sameList(
  rows: readonly SensitiveRow[],
  saved: readonly SensitiveCountry[],
): boolean {
  return JSON.stringify(listOfRows(rows)) === JSON.stringify(listOfRows(rowsOf(saved)));
}
