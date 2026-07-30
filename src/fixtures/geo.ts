import type { GeoOutline } from "../types/region";
import continents from "./data/continents.json";

export function loadContinentOutlines(): GeoOutline[] {
  return continents as GeoOutline[];
}
