const ENTRY_SEPARATOR = /[,;]/u;

export const PEOPLE_SEPARATOR = ", ";

export function splitPeople(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(ENTRY_SEPARATOR)
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

export function joinPeople(entries: readonly string[]): string {
  return entries
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0)
    .join(PEOPLE_SEPARATOR);
}

export function addPerson(raw: string | undefined, entry: string): string {
  const incoming = splitPeople(entry);
  if (incoming.length === 0) return raw ?? "";

  const merged = splitPeople(raw);
  for (const person of incoming) {
    if (!merged.includes(person)) merged.push(person);
  }
  return joinPeople(merged);
}

export function removePerson(raw: string | undefined, index: number): string {
  const current = splitPeople(raw);
  return joinPeople(current.filter((_, position) => position !== index));
}
