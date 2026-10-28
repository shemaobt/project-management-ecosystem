import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ESLint } from "eslint";
import { compile } from "tailwindcss";
import type { ViteDevServer } from "vite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { BRAND_INK, NOT_SHIPPED_STYLING } from "../../../eslint.config.js";
import { TOAST_CLASSNAMES } from "../../components/ui/Toaster";
import { CHROME, launchChrome, serveProbe } from "../../__tests__/headlessChrome";

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

const SURFACE_INK =
  /text-(fg|fg-strong|fg-muted|fg-subtle|on-brand|on-dark|on-light)(?:\/\d+)?(?![-a-z])/gu;

const TYPED_SLOTS = ["success", "error", "warning", "info"] as const;

describe("the toast, which is six fills under one class", () => {
  it("keeps the neutral fill and ink on the slot every toast carries", () => {
    const base = TOAST_CLASSNAMES.toast.split(/\s+/u);
    expect(base).toContain("bg-inverse");
    expect(TOAST_CLASSNAMES.toast.match(SURFACE_INK)).toEqual(["text-on-dark"]);
    expect(Object.keys(TOAST_CLASSNAMES)).not.toContain("default");
    expect(Object.keys(TOAST_CLASSNAMES)).not.toContain("loading");
  });

  it("scopes every per-type utility to its own data-type", () => {
    for (const slot of TYPED_SLOTS) {
      for (const utility of TOAST_CLASSNAMES[slot].split(/\s+/u)) {
        expect(utility, slot).toMatch(new RegExp(`^data-\\[type=${slot}\\]:`, "u"));
      }
    }
  });

  it("names on-brand where the fill is a brand fill, and inherits on-dark elsewhere", () => {
    for (const slot of TYPED_SLOTS) {
      const { ink } = TOAST_PAINT[slot];
      expect(TOAST_CLASSNAMES[slot].match(SURFACE_INK) ?? [], slot).toEqual(
        ink === "on-dark" ? [] : [`text-${ink}`],
      );
    }
  });

  it("lets the description inherit that ink instead of restating a surface", () => {
    expect(TOAST_CLASSNAMES.description).toContain("text-current/80");
  });
});

type ToastType = "default" | "loading" | (typeof TYPED_SLOTS)[number];
type Paint = Record<ToastType, { fill: string; ink: string }>;
type ClassNames = Record<string, string>;

const TOAST_PAINT: Record<ToastType, { fill: string; ink: string }> = {
  default: { fill: "inverse", ink: "on-dark" },
  loading: { fill: "inverse", ink: "on-dark" },
  success: { fill: "verde-claro-ink", ink: "on-brand" },
  error: { fill: "telha", ink: "on-brand" },
  warning: { fill: "status-attention-fg", ink: "on-dark" },
  info: { fill: "azul-ink", ink: "on-brand" },
};

const FE03_CLASSNAMES: ClassNames = {
  toast: "text-on-dark",
  default: "bg-inverse",
  success: "bg-verde-claro",
  error: "bg-telha",
  warning: "bg-status-attention",
  info: "bg-azul",
  loading: "bg-inverse",
};

function rgb(token: string): string {
  const hex = resolve(token);
  const [r, g, b] = [1, 3, 5].map((at) => parseInt(hex.slice(at, at + 2), 16));
  return `rgb(${r}, ${g}, ${b})`;
}

function luminance(color: string): number {
  const channels = color.match(/\d+/gu)!.slice(0, 3).map(Number);
  const [r, g, b] = channels.map((channel) => {
    const value = channel / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
}

const PROBE_MODULE = `
import { createElement } from "react";
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import { Toaster as SonnerToaster, toast } from "sonner";
import { Toaster } from "/src/components/ui/Toaster.tsx";

const pause = (ms) => new Promise((done) => setTimeout(done, ms));

async function until(check, what) {
  const deadline = Date.now() + 30000;
  while (!check()) {
    if (Date.now() > deadline) throw new Error("nunca aconteceu: " + what);
    await pause(20);
  }
}

window.probe = {
  async raise(css, classNames) {
    document.head.append(Object.assign(document.createElement("style"), { textContent: css }));
    const root = createRoot(document.body.appendChild(document.createElement("div")));
    flushSync(() =>
      root.render(
        classNames
          ? createElement(SonnerToaster, { toastOptions: { unstyled: true, classNames } })
          : createElement(Toaster),
      ),
    );
    await pause(50);
    toast("default");
    toast.success("success");
    toast.error("error");
    toast.warning("warning");
    toast.info("info");
    toast.loading("loading");
    await until(() => document.querySelectorAll("[data-sonner-toast]").length === 6, "six toasts");
  },
  paint() {
    return Object.fromEntries(
      [...document.querySelectorAll("[data-sonner-toast]")].map((element) => {
        const style = getComputedStyle(element);
        return [element.querySelector("[data-title]").textContent, { fill: style.backgroundColor, ink: style.color }];
      }),
    );
  },
  reverseUtilities() {
    let moved = 0;
    for (const sheet of document.styleSheets) {
      for (const layer of sheet.cssRules) {
        if (!(layer instanceof CSSLayerBlockRule) || layer.name !== "utilities") continue;
        const rules = [...layer.cssRules].map((rule) => rule.cssText);
        while (layer.cssRules.length) layer.deleteRule(0);
        for (const rule of rules) layer.insertRule(rule, 0);
        moved += rules.length;
      }
    }
    return moved;
  },
};
`;

async function compileToastCss(): Promise<string> {
  const tailwind = readFileSync(
    join(process.cwd(), "node_modules", "tailwindcss", "index.css"),
    "utf8",
  );
  const compiler = await compile(css, {
    base: process.cwd(),
    loadStylesheet: async (id, base) => {
      if (id !== "tailwindcss") throw new Error(`stylesheet inesperado: ${id}`);
      return { path: id, base, content: tailwind };
    },
  });
  const candidates = [TOAST_CLASSNAMES, FE03_CLASSNAMES].flatMap((slots) =>
    Object.values(slots).flatMap((classes) => classes.split(/\s+/u)),
  );
  return compiler.build([...new Set(candidates)]);
}

describe.skipIf(!CHROME)("the toast, raised in a browser (headless Chrome)", () => {
  let scratch = "";
  let server: ViteDevServer | undefined;
  let browser: Awaited<ReturnType<typeof launchChrome>> | undefined;
  const measured = new Map<"ours" | "fe03", { emitted: Paint; reversed: Paint; moved: number }>();

  beforeAll(async () => {
    scratch = mkdtempSync(join(tmpdir(), "toast-fill-"));
    const [toastCss, dev] = await Promise.all([
      compileToastCss(),
      serveProbe({
        scratch,
        module: PROBE_MODULE,
        include: ["react", "react/jsx-dev-runtime", "react-dom", "react-dom/client", "sonner"],
      }),
    ]);
    server = dev;
    browser = await launchChrome(CHROME!, scratch);
    const origin = server.resolvedUrls!.local[0];
    for (const [name, classNames] of [
      ["ours", null],
      ["fe03", FE03_CLASSNAMES],
    ] as const) {
      await browser.open(origin);
      await browser.evaluate(
        `window.probe.raise(${JSON.stringify(toastCss)}, ${JSON.stringify(classNames)})`,
      );
      const emitted = await browser.evaluate<Paint>("window.probe.paint()");
      const moved = await browser.evaluate<number>("window.probe.reverseUtilities()");
      const reversed = await browser.evaluate<Paint>("window.probe.paint()");
      measured.set(name, { emitted, reversed, moved });
    }
  }, 240_000);

  afterAll(async () => {
    browser?.close();
    await server?.close();
    if (scratch) rmSync(scratch, { recursive: true, force: true });
  });

  it("paints each of the six types with its own fill and ink", () => {
    const expected = Object.fromEntries(
      Object.entries(TOAST_PAINT).map(([type, { fill, ink }]) => [
        type,
        { fill: rgb(fill), ink: rgb(ink) },
      ]),
    );
    expect(measured.get("ours")!.emitted).toEqual(expected);
  });

  it("paints the same when every utility is emitted in the opposite order", () => {
    const { emitted, reversed, moved } = measured.get("ours")!;
    expect(moved).toBeGreaterThan(10);
    expect(reversed).toEqual(emitted);
  });

  it("keeps the 13px ink at AA on every fill", () => {
    for (const [type, { fill, ink }] of Object.entries(measured.get("ours")!.emitted)) {
      expect(contrast(fill, ink), type).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("sees emission order: FE-03's slots let Tailwind pick the fill", () => {
    const { emitted, reversed } = measured.get("fe03")!;
    expect(emitted.info.fill).toBe(rgb("inverse"));
    expect(reversed.info.fill).toBe(rgb("azul"));
    expect(reversed).not.toEqual(emitted);
  });
});
