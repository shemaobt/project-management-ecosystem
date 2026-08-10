import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ESLint } from "eslint";
import { describe, expect, it } from "vitest";
import { BRAND_INK, NOT_SHIPPED_STYLING } from "../../../eslint.config.js";

const eslint = new ESLint();

const FIXTURE = "src/components/ui/InkFixture.tsx";

async function reportsIn(path: string, code: string): Promise<string[]> {
  const [result] = await eslint.lintText(code, { filePath: path });
  return result.messages
    .filter((message) => message.ruleId === "no-restricted-syntax")
    .map((message) => message.message);
}

function brandInkReports(code: string): Promise<string[]> {
  return reportsIn(FIXTURE, code);
}

const css = readFileSync(join(process.cwd(), "src/index.css"), "utf8");
const lightPalette = css.split(/\.dark\s*\{/u)[0];

const declarations = new Map<string, string>();
for (const [, name, value] of lightPalette.matchAll(
  /--([\w-]+):\s*([^;]+);/gu,
)) {
  declarations.set(name, value.trim());
}

function resolve(token: string): string {
  const value = declarations.get(`color-${token}`);
  if (value === undefined) {
    throw new Error(`--color-${token} não existe em src/index.css`);
  }
  let resolved = value;
  for (
    let reference = resolved.match(/^var\(--([\w-]+)\)$/u);
    reference;
    reference = resolved.match(/^var\(--([\w-]+)\)$/u)
  ) {
    const next = declarations.get(reference[1]);
    if (next === undefined) {
      throw new Error(`--${reference[1]} não existe em src/index.css`);
    }
    resolved = next.trim();
  }
  return resolved;
}

const INK_SUBSTITUTIONS: [string, string][] = [
  ["verde", "fg"],
  ["verde", "on-light"],
  ["preto", "fg-strong"],
  ["branco", "on-brand"],
  ["branco", "on-dark"],
];

const blockedInk = BRAND_INK.match(/\(([^)]+)\)/u)![1].split("|");

describe("the brand-ink lint rule", () => {
  it("flags a brand token used as ink", async () => {
    const reports = await brandInkReports(
      `export const tone = "bg-muted text-verde";`,
    );
    expect(reports).toHaveLength(1);
    expect(reports[0]).toContain("text-on-brand");
  });

  it("flags it inside a template literal, and through an alpha", async () => {
    const reports = await brandInkReports(
      "const base = 'x';\nexport const tone = `${base} text-branco/80`;",
    );
    expect(reports).toHaveLength(1);
  });

  it("flags a variant prefix", async () => {
    const reports = await brandInkReports(
      `export const tone = "text-fg-subtle hover:text-preto";`,
    );
    expect(reports).toHaveLength(1);
  });

  it("leaves verde-claro alone — it has no semantic counterpart", async () => {
    expect(
      await brandInkReports(`export const tone = "bg-status-good-bg text-verde-claro";`),
    ).toEqual([]);
  });

  it("leaves fills and borders alone — they are out of this rule's scope", async () => {
    expect(
      await brandInkReports(
        `export const tone = "bg-verde/8 bg-branco/20 border-verde/18 bg-preto/55 fill-telha";`,
      ),
    ).toEqual([]);
  });

  it("passes the tokens that replace them", async () => {
    expect(
      await brandInkReports(
        `export const tones = ["text-fg", "text-fg-strong", "text-on-brand", "text-on-dark/80", "text-on-light"];`,
      ),
    ).toEqual([]);
  });

  it("does not run on the fixtures a test has to write", async () => {
    const violation = `export const tone = "text-verde";`;
    expect(await brandInkReports(violation)).toHaveLength(1);
    expect(await reportsIn(__filename, violation)).toEqual([]);
    expect(NOT_SHIPPED_STYLING).toEqual(["**/__tests__/**"]);
  });
});

describe("the ink substitutions", () => {
  it("covers every token the rule blocks", () => {
    const covered = [...new Set(INK_SUBSTITUTIONS.map(([brand]) => brand))];
    expect(covered.sort()).toEqual([...blockedInk].sort());
  });

  it("reads a light palette that actually resolves", () => {
    expect(declarations.size).toBeGreaterThan(50);
    expect(resolve("verde")).toMatch(/^#[0-9a-f]{6}$/u);
  });

  it("repaints nothing — each pair is the same colour today", () => {
    for (const [brand, semantic] of INK_SUBSTITUTIONS) {
      expect(resolve(semantic), `${brand} → ${semantic}`).toBe(resolve(brand));
    }
  });

  it("would catch a substitution that changes the colour", () => {
    expect(resolve("fg-muted")).not.toBe(resolve("verde"));
    expect(resolve("fg-subtle")).not.toBe(resolve("preto"));
    expect(resolve("areia")).not.toBe(resolve("branco"));
  });
});
