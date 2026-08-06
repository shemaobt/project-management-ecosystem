import type { Intercessor } from "../types/prayer";

const intercessors: Intercessor[] = [];

export function loadIntercessors(): Intercessor[] {
  return structuredClone(intercessors);
}
