import type { MediaAudience } from "../types/project";

export function canExportNotes(audience: MediaAudience): boolean {
  return audience === "coordenacao";
}
