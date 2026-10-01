import { describe, expect, it } from "vitest";
import { progressPercent, readableSize } from "../exportProgress";
import { previewNames } from "../importPreview";

describe("o progresso da exportação", () => {
  it("a porcentagem só existe quando o servidor disse o tamanho", () => {
    expect(progressPercent({ loaded: 250, total: 1000 })).toBe(25);
    expect(progressPercent({ loaded: 250, total: null })).toBeNull();
    expect(progressPercent({ loaded: 2000, total: 1000 })).toBe(100);
  });

  it("o tamanho cresce de unidade com o arquivo", () => {
    expect(readableSize(10)).toBe("1 KB");
    expect(readableSize(300 * 1024)).toBe("300 KB");
    expect(readableSize(2.5 * 1024 * 1024)).toBe("2.5 MB");
  });
});

describe("a prévia da importação", () => {
  it("nomeia pela língua, cai para o id, e conta o que passa de dez", () => {
    const projects = [
      { id: "a", languageName: " " },
      ...Array.from({ length: 11 }, (_, index) => ({ id: `p${index}`, languageName: `L${index}` })),
    ];

    const { shown, more } = previewNames(projects);

    expect(shown[0]).toBe("a");
    expect(shown).toHaveLength(10);
    expect(more).toBe(2);
  });
});
