import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  BIBLE_BOOKS,
  bookName,
  bookNameById,
} from "../../../../constants/bible";

const SRC = join(__dirname, "../../../..");

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) {
      return entry === "__tests__" ? [] : sourceFiles(path);
    }
    return /\.tsx$/.test(entry) ? [path] : [];
  });
}

describe("nomes dos livros seguem o idioma", () => {
  it("em EN usa o nome em inglês e em PT o português", () => {
    for (const book of BIBLE_BOOKS) {
      expect(bookName(book, "en")).toBe(book.en);
      expect(bookName(book, "pt")).toBe(book.name);
    }
    expect(bookName(BIBLE_BOOKS[0], "en")).toBe("Genesis");
  });

  it("uma linha salva em português aparece em inglês, pela chave", () => {
    expect(bookNameById("gen", "Gênesis", "en")).toBe("Genesis");
    expect(bookNameById("gen", "Gênesis", "pt")).toBe("Gênesis");
    expect(bookNameById("custom", "Outro", "en")).toBe("Outro");
  });

  it("nenhuma tela lista livros sem passar pelo idioma", () => {
    const offenders = sourceFiles(SRC).filter((file) => {
      const text = readFileSync(file, "utf8");
      if (file.endsWith("constants/bible.ts")) return false;
      const listsBooks = /BIBLE_BOOKS/.test(text);
      const readsName = /\bbook\.name\b|\bbook\.en\b/.test(text);
      const usesHelper = /bookName(ById)?\(/.test(text);
      return (listsBooks || readsName) && !usesHelper;
    });
    expect(offenders).toEqual([]);
  });

  it("a tela não imprime book.name nem row.name direto", () => {
    const text = readFileSync(
      join(SRC, "components/pages/ficha/tabs/progresso/BookTable.tsx"),
      "utf8",
    );
    expect(text).not.toMatch(/\{(book|row)\.name\}|\$\{(book|row)\.name\}/);
  });
});
