import { readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();
const TEST_FILE = /(?:^|\/)__tests__\//u;

function walk(dir: string): string[] {
  return readdirSync(join(ROOT, dir), { withFileTypes: true }).flatMap(
    (entry) => {
      const path = join(dir, entry.name);
      return entry.isDirectory() ? walk(path) : [path];
    },
  );
}

const css = readFileSync(join(ROOT, "src/index.css"), "utf8");

const shipped = walk("src")
  .map((path) => relative(ROOT, join(ROOT, path)).split("\\").join("/"))
  .filter((path) => /\.(?:tsx?|css)$/u.test(path) && !TEST_FILE.test(path))
  .map((path) => ({ path, text: readFileSync(join(ROOT, path), "utf8") }));

const MOVEMENT = /translate|scale|rotate/u;

const BUILTIN_ANIMATIONS = ["spin", "pulse"];

function blockAfter(text: string, opener: RegExp): string {
  const start = text.search(opener);
  if (start < 0) return "";
  const open = text.indexOf("{", start);
  let depth = 0;
  for (let index = open; index < text.length; index += 1) {
    if (text[index] === "{") depth += 1;
    if (text[index] === "}") depth -= 1;
    if (depth === 0) return text.slice(open + 1, index);
  }
  return "";
}

const reduced = blockAfter(
  css,
  /@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{/u,
);

const theme = blockAfter(css, /@theme\s+static\s*\{/u);

const themeAnimations = [
  ...theme.matchAll(/--animate-([\w-]+):\s*([\w-]+)\s[^;]*;/gu),
].map(([, name, keyframes]) => ({ name, keyframes }));

function keyframesBody(name: string): string {
  return blockAfter(css, new RegExp(`@keyframes\\s+${name}\\s*\\{`, "u"));
}

function reducedAnimation(name: string): string | undefined {
  return reduced.match(new RegExp(`--animate-${name}:\\s*([\\w-]+)\\s`, "u"))?.[1];
}

const classTokens = shipped
  .filter(({ path }) => path.endsWith(".tsx") || path.endsWith(".ts"))
  .flatMap(({ path, text }) =>
    [...text.matchAll(/[^\s"'`{}]+/gu)].map(([token]) => ({ path, token })),
  );

describe("prefers-reduced-motion (OBT-502)", () => {
  it("has one block in index.css, marked with its issue", () => {
    expect(reduced).not.toBe("");
    expect(css).toContain("/* OBT-502 */");
    expect(
      css.match(/@media\s*\(prefers-reduced-motion:\s*reduce\)/gu),
    ).toHaveLength(1);
  });

  it("finds the theme's animations, so the next checks are not vacuous", () => {
    expect(themeAnimations.map(({ name }) => name)).toEqual(
      expect.arrayContaining(["fade-in", "slide-up", "slide-in-right"]),
    );
  });

  it("replaces every theme animation whose keyframes move, with one that does not", () => {
    for (const { name, keyframes } of themeAnimations) {
      if (!MOVEMENT.test(keyframesBody(keyframes))) continue;
      const replacement = reducedAnimation(name);
      expect(replacement, `--animate-${name} escapes the block`).toBeDefined();
      expect(
        keyframesBody(replacement ?? ""),
        `--animate-${name} still moves under reduce`,
      ).not.toBe("");
      expect(
        MOVEMENT.test(keyframesBody(replacement ?? "")),
        `--animate-${name} still moves under reduce`,
      ).toBe(false);
    }
  });

  it("keeps the fades: a keyframe of opacity alone stays as declared", () => {
    expect(reducedAnimation("fade-in")).toBeUndefined();
    expect(keyframesBody("fade-in")).toContain("opacity");
  });

  it("uses only animations the block knows: the theme's, spin and pulse", () => {
    const declared = new Set([
      ...themeAnimations.map(({ name }) => name),
      ...BUILTIN_ANIMATIONS,
    ]);
    const used = classTokens
      .map(({ token }) =>
        token.match(/(?:^|:)animate-(?:\(--animate-)?([\w-]+)/u),
      )
      .filter((match): match is RegExpMatchArray => match !== null)
      .map((match) => match[1]);
    expect(used.length).toBeGreaterThan(0);
    expect(used.filter((name) => !declared.has(name))).toEqual([]);
  });

  it("swaps the spinner's rotation for an opacity cycle", () => {
    const replacement = reducedAnimation("spin");
    expect(replacement).toBeDefined();
    expect(keyframesBody(replacement ?? "")).toContain("opacity");
    expect(MOVEMENT.test(keyframesBody(replacement ?? ""))).toBe(false);
  });

  it("neutralises every hover displacement the source writes", () => {
    const hoverMoves = classTokens.filter(({ token }) =>
      /(?:^|[^\w-])(?:[\w-]+:)*hover:-?(?:translate|scale)-/u.test(token),
    );
    expect(hoverMoves.length).toBeGreaterThan(0);
    const offenders = hoverMoves.filter(({ token }) => {
      const prefix = token.match(/(hover:-?(?:translate|scale)-)/u)?.[1] ?? "";
      return !reduced.includes(`[class*="${prefix}"]:hover`);
    });
    expect(offenders).toEqual([]);
  });

  it("does not let a displacement hide behind another state", () => {
    const behindState = classTokens.filter(
      ({ token }) =>
        /^(?:group-hover|peer-hover|focus|focus-visible|focus-within|active):-?(?:translate|scale)-/u.test(
          token,
        ),
    );
    expect(behindState).toEqual([]);
  });

  it("limits transitions to properties that do not displace or resize", () => {
    const property = reduced.match(/transition-property:\s*([^;]+);/u)?.[1];
    expect(property).toBeDefined();
    const listed = (property ?? "").split(",").map((entry) => entry.trim());
    expect(listed).toContain("opacity");
    expect(
      listed.filter((entry) =>
        /^(?:all|transform|translate|scale|rotate|width|height|top|left|right|bottom|margin|padding|inset)/u.test(
          entry,
        ),
      ),
    ).toEqual([]);
  });

  it("wins over the utilities: the block sits outside every @layer", () => {
    const before = css.slice(0, css.indexOf("/* OBT-502 */"));
    const depth =
      (before.match(/\{/gu) ?? []).length - (before.match(/\}/gu) ?? []).length;
    expect(depth).toBe(0);
  });

  it("leaves no inline transition or animation for the block to lose to", () => {
    const inline = shipped.filter(
      ({ path, text }) =>
        path.endsWith(".tsx") &&
        /style=\{\{[^}]*(?:transition|animation)/u.test(text),
    );
    expect(inline.map(({ path }) => path)).toEqual([]);
  });

  it("declares no keyframes in components", () => {
    const stray = shipped.filter(
      ({ path, text }) => path !== "src/index.css" && /@keyframes/u.test(text),
    );
    expect(stray.map(({ path }) => path)).toEqual([]);
  });
});
