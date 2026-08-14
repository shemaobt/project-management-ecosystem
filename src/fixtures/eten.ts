import type { EtenCreditEntry } from "../types/eten";

const etenCredits: EtenCreditEntry[] = [];

export function loadEtenCredits(): EtenCreditEntry[] {
  return structuredClone(etenCredits);
}
