/** How many records the import preview names before it counts the rest (INT-11 · OBT-416). */
export const PREVIEW_NAMES = 10;

/**
 * The names a person recognises a file by — the language, or the id when a record has none —
 * so the preview says *which* projects the file touches, not only how many.
 */
export function previewNames(
  projects: readonly { languageName: string; id: string }[],
): { shown: string[]; more: number } {
  const names = projects.map((project) => project.languageName.trim() || project.id);
  return {
    shown: names.slice(0, PREVIEW_NAMES),
    more: Math.max(0, names.length - PREVIEW_NAMES),
  };
}
