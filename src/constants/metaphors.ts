export const CARD_METAPHORS = ["atlas", "diario"] as const;

export type CardMetaphor = (typeof CARD_METAPHORS)[number];

export const DEFAULT_METAPHOR: CardMetaphor = "atlas";

export const METAPHOR_LABEL_KEYS: Record<CardMetaphor, string> = {
  atlas: "nav_atlas",
  diario: "nav_diario",
};

const RETIRED_METAPHORS: Record<string, CardMetaphor> = {
  coral: "diario",
};

export const isCardMetaphor = (value: string): value is CardMetaphor =>
  CARD_METAPHORS.some((key) => key === value);

export function normaliseMetaphor(value: string | null): CardMetaphor {
  if (!value) return DEFAULT_METAPHOR;
  if (isCardMetaphor(value)) return value;
  return RETIRED_METAPHORS[value] ?? DEFAULT_METAPHOR;
}
