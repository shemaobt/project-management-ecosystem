const ISO_639_3 = /^[a-z]{3}$/i;

export function isIsoShape(code: string): boolean {
  return ISO_639_3.test(code.trim());
}

export function parseCoordinate(raw: string): number | null {
  const value = Number(raw.trim().replace(",", "."));
  return raw.trim() !== "" && Number.isFinite(value) ? value : null;
}

export function hasPlottableCoords(
  coords: readonly number[] | undefined,
): boolean {
  if (!coords || coords.length !== 2) return false;
  return !coords.every((value) => value === 0);
}
