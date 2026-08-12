import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const SHIPPED = /\.tsx?$/u;
const TEST_FILE = /(?:^|\/)__tests__\//u;
const PRIMITIVES = "src/components/ui";

const HAND_ROLLED =
  /(?:role=["'](?:radio|radiogroup|checkbox|switch|tab|tablist|combobox|slider)["']|aria-checked=)/gu;

function walk(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    return entry.isDirectory() ? walk(path) : [path];
  });
}

function shippedOutsidePrimitives(): string[] {
  return walk(join(process.cwd(), "src/components"))
    .map((path) => relative(process.cwd(), path).split("\\").join("/"))
    .filter(
      (path) =>
        SHIPPED.test(path) &&
        !TEST_FILE.test(path) &&
        !path.startsWith(PRIMITIVES),
    );
}

describe("os papéis ARIA moram no primitivo, não na tela", () => {
  const files = shippedOutsidePrimitives();

  it("varre a tela que ships, e não o primitivo", () => {
    expect(files.length).toBeGreaterThan(20);
    expect(files.some((path) => path.startsWith(PRIMITIVES))).toBe(false);
    expect(files).toContain(
      "src/components/pages/ficha/tabs/saude/RatingChoice.tsx",
    );
  });

  it("nenhuma tela escreve um papel ARIA à mão", () => {
    const offenders = files.flatMap((path) => {
      const found = [...readFileSync(path, "utf8").matchAll(HAND_ROLLED)];
      return found.map((match) => `${path} escreve ${match[0]}`);
    });

    expect(offenders).toEqual([]);
  });

  it("o grupo de notas da Saúde usa o primitivo do Radix", () => {
    const source = readFileSync(
      "src/components/pages/ficha/tabs/saude/RatingChoice.tsx",
      "utf8",
    );
    expect(source).toContain("RadioGroup");
    expect(source).toContain("RadioButton");
    expect(source).not.toContain("<button");
  });
});
