import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it } from "vitest";
import { BIBLE_BOOKS } from "../../../../constants/bible";
import type { BookProgressItem } from "../../../../types/project";

const { default: i18n } = await import("../../../../i18n");
const { BookTable, CappedNotice } = await import("../tabs/progresso/BookTable");
const { addBookRow, clampCount, readCount, typeBookCount } = await import("../tabs/progresso/sections");

beforeEach(async () => {
  await i18n.changeLanguage("pt");
});

const ruth = BIBLE_BOOKS.find((book) => book.id === "rut")!;
const rows = (): BookProgressItem[] => addBookRow([], ruth);

/** The notice text the table renders for a cut, from the table's own key. */
const noticeFor = (capped: { max: number } | null) =>
  capped ? i18n.t("progress_capped", { book: "Rute", max: capped.max }) : null;

describe("digitar 9 em Rute · Traduzido (OBT-605, PME-FRM-050)", () => {
  it("o valor guardado é 4, e a digitação deixa o aviso com o 4", () => {
    const typed = typeBookCount(rows(), 0, "translated", "9");
    expect(typed.rows[0].translated).toBe(4);
    expect(typed.capped).toEqual({ bookId: "rut", field: "translated", max: 4 });
    expect(noticeFor(typed.capped)).toBe("O máximo de Rute é 4; guardamos 4.");
  });

  it("o aviso aparece na tela numa região viva, com o 4", () => {
    const typed = typeBookCount(rows(), 0, "translated", "9");
    const html = renderToStaticMarkup(createElement(CappedNotice, { text: noticeFor(typed.capped) }));
    expect(html).toContain('role="status"');
    expect(html).toContain('aria-live="polite"');
    expect(html).toContain("O máximo de Rute é 4; guardamos 4.");
  });

  it("um número dentro do livro não corta nem avisa", () => {
    const typed = typeBookCount(rows(), 0, "translated", "3");
    expect(typed.rows[0].translated).toBe(3);
    expect(typed.capped).toBeNull();
    expect(renderToStaticMarkup(createElement(CappedNotice, { text: noticeFor(typed.capped) }))).not.toContain(
      "guardamos",
    );
  });

  it("os três campos do livro avisam do mesmo jeito", () => {
    for (const field of ["translated", "communityChecked", "mentorApproved"] as const) {
      const typed = typeBookCount(rows(), 0, field, "60");
      expect(typed.rows[0][field], field).toBe(4);
      expect(typed.capped, field).toEqual({ bookId: "rut", field, max: 4 });
    }
  });

  it("a região viva fica montada na tabela antes de qualquer aviso", () => {
    const html = renderToStaticMarkup(createElement(BookTable, { rows: rows(), onChange: () => undefined }));
    expect(html).toContain('role="status"');
    expect(html).not.toContain("guardamos");
  });

  it("em inglês, o mesmo aviso sem português", async () => {
    await i18n.changeLanguage("en");
    const text = i18n.t("progress_capped", { book: "Ruth", max: 4 });
    expect(text).toBe("Ruth has at most 4; we kept 4.");
    expect(text).not.toContain("guardamos");
  });
});

describe("readCount — a regra do corte, para quem não tem máximo também", () => {
  it("acima do máximo corta e diz onde; sem máximo nunca corta", () => {
    expect(readCount("9", 4)).toEqual({ value: 4, cappedAt: 4 });
    expect(readCount("4", 4)).toEqual({ value: 4, cappedAt: null });
    expect(readCount("90")).toEqual({ value: 90, cappedAt: null });
    expect(readCount("-3", 4)).toEqual({ value: 0, cappedAt: null });
    expect(clampCount("9", 4)).toBe(4);
  });
});
