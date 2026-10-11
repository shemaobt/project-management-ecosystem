import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/*
 * OBT-505 — the dark palette, measured before it is called ready. It is ours, derived from the two
 * dark surfaces the prototype already draws (the topbar and the night globe), and waits for the
 * client (§7.4). The rule it keeps: the theme is owned by the tokens — `.dark` reassigns the
 * `--color-*` names the utilities read, so a saturated fill keeps its value and only the ink on
 * the page moves; and the night globe stays light in both themes through `.tema-claro`.
 */

const css = readFileSync(new URL("../../index.css", import.meta.url), "utf8");

type Tokens = Map<string, string>;

const block = (selector: string): Tokens => {
  const body = new RegExp(`${selector.replace(".", "\\.")}\\s*\\{([^}]*)\\}`, "u").exec(css)?.[1];
  if (!body) throw new Error(selector);
  return declarations(body);
};

function declarations(source: string): Tokens {
  return new Map(
    [...source.matchAll(/^\s*--([a-z0-9-]+):\s*([^;]+);/gmu)].map((match) => [
      match[1],
      match[2].trim(),
    ]),
  );
}

const LIGHT: Tokens = (() => {
  const first: Tokens = new Map();
  for (const [name, value] of declarations(css)) if (!first.has(name)) first.set(name, value);
  const theme = /@theme static \{([\s\S]*?)\n\}/u.exec(css)?.[1] ?? "";
  for (const [name, value] of declarations(theme)) first.set(name, value);
  return first;
})();
const DARK_ONLY = block(".dark");
const ISLAND_ONLY = block(".dark .tema-claro");
const DARK: Tokens = new Map([...LIGHT, ...DARK_ONLY]);
const ISLAND: Tokens = new Map([...DARK, ...ISLAND_ONLY]);

function resolve(tokens: Tokens, name: string, depth = 0): string {
  const value = tokens.get(name);
  if (value === undefined || depth > 12) throw new Error(`--${name}`);
  const indirection = /^var\(--([a-z0-9-]+)\)$/u.exec(value);
  return indirection ? resolve(tokens, indirection[1], depth + 1) : value;
}

const color = (tokens: Tokens, name: string) =>
  resolve(tokens, tokens.has(`color-${name}`) ? `color-${name}` : name);

type Rgba = { rgb: number[]; alpha: number };

function parse(value: string): Rgba {
  const wash = /^rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)$/u.exec(value);
  if (wash) return { rgb: wash.slice(1, 4).map(Number), alpha: Number(wash[4]) };
  const digits = value.replace("#", "");
  if (!/^[0-9a-f]{6}$/iu.test(digits)) throw new Error(value);
  return { rgb: [0, 2, 4].map((start) => parseInt(digits.slice(start, start + 2), 16)), alpha: 1 };
}

const over = (layer: Rgba, under: number[]) =>
  layer.rgb.map((value, index) => layer.alpha * value + (1 - layer.alpha) * under[index]);

function luminance(rgb: number[]): number {
  const [red, green, blue] = rgb
    .map((value) => value / 255)
    .map((value) => (value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4));
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

function contrast(tokens: Tokens, ink: string, surface: string, behind = "canvas"): number {
  const base = over(parse(color(tokens, surface)), parse(color(tokens, behind)).rgb);
  const text = over(parse(color(tokens, ink)), base);
  const [lighter, darker] = [luminance(text), luminance(base)].sort((a, b) => b - a);
  return (lighter + 0.05) / (darker + 0.05);
}

const SURFACES = ["canvas", "elevated", "muted", "paper"] as const;

/** Every token a class string paints text with on a page surface. */
const INKS = [
  "fg",
  "fg-strong",
  "fg-muted",
  "fg-subtle",
  "link",
  "telha",
  "accent",
  "accent-press",
  "azul",
  "azul-ink",
  "verde-claro",
  "verde-claro-ink",
  "status-good-ink",
  "status-attention-fg",
  "status-attention-ink",
  "urgent",
  "deadline-soon",
] as const;

describe("a paleta escura carrega texto pequeno em toda superfície (OBT-505)", () => {
  for (const ink of INKS) {
    it(`${ink} passa AA sobre as quatro superfícies escuras`, () => {
      for (const surface of SURFACES) {
        expect(contrast(DARK, ink, surface), `${ink} / ${surface}`).toBeGreaterThanOrEqual(4.5);
      }
    });
  }

  it("cada selo se lê no próprio fundo, no escuro como no claro", () => {
    const pairs = [
      ["status-good-ink", "status-good-bg"],
      ["status-attention-ink", "status-attention-bg"],
      ["accent-press", "accent-soft"],
      ["accent-press", "status-critical-bg"],
      ["rhythm-done-fg", "rhythm-done-bg"],
      ["rhythm-pending-fg", "rhythm-pending-bg"],
      ["rhythm-overdue-fg", "rhythm-overdue-bg"],
      ["rhythm-new-fg", "rhythm-new-bg"],
      ["answered-fg", "answered-bg"],
    ] as const;
    for (const [ink, fill] of pairs) {
      expect(contrast(DARK, ink, fill), `${ink} / ${fill}`).toBeGreaterThanOrEqual(4.5);
      expect(contrast(LIGHT, ink, fill), `${ink} / ${fill} (claro)`).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("a linha ainda se vê sobre o fundo escuro", () => {
    expect(contrast(DARK, "line-strong", "canvas")).toBeGreaterThan(1.3);
    expect(contrast(DARK, "line", "canvas")).toBeGreaterThan(1.2);
  });
});

describe("um preenchimento saturado não muda de cor com o tema", () => {
  const FILLS = {
    brand: "telha",
    "azul-fill": "azul-ink",
    "verde-claro-fill": "verde-claro-ink",
    "attention-fill": "status-attention-fg",
    "subtle-fill": "fg-subtle",
  } as const;

  it("no claro, cada nome de preenchimento pinta exatamente a tinta de onde saiu", () => {
    for (const [fill, ink] of Object.entries(FILLS)) {
      expect(color(LIGHT, fill), fill).toBe(color(LIGHT, ink));
    }
  });

  it("no escuro, o preenchimento fica e só a tinta do texto clareia", () => {
    for (const [fill, ink] of Object.entries(FILLS)) {
      expect(color(DARK, fill), fill).toBe(color(LIGHT, fill));
      expect(color(DARK, ink), ink).not.toBe(color(LIGHT, ink));
    }
  });

  it("e o texto claro sobre ele continua passando, porque nada debaixo dele mudou", () => {
    for (const fill of Object.keys(FILLS)) {
      expect(contrast(DARK, "on-dark", fill), fill).toBe(contrast(LIGHT, "on-dark", fill));
    }
  });

  it("o bloco escuro não toca um token cru que um preenchimento lê", () => {
    const raw = ["shema-telha", "bg-brand", "azul-ink", "verde-claro-ink", "status-attention-fg", "fg-subtle"];
    for (const name of raw) expect(DARK_ONLY.has(name), name).toBe(false);
  });
});

describe("o globo noturno é claro nos dois temas", () => {
  it("dentro da ilha, cada token que ela repõe volta ao valor do tema claro", () => {
    for (const name of ISLAND_ONLY.keys()) {
      expect(resolve(ISLAND, name), name).toBe(resolve(LIGHT, name));
    }
  });

  it("a ilha repõe toda tinta que o medalhão e a esfera usam", () => {
    const atlas = join(process.cwd(), "src/components/pages/projetos/Atlas");
    const used = new Set<string>();
    for (const file of readdirSync(atlas).filter((entry) => entry.endsWith(".tsx"))) {
      const source = readFileSync(join(atlas, file), "utf8");
      for (const match of source.matchAll(/(?<![\w-])(?:text|bg|border|stroke|fill)-([a-z][a-z0-9-]*)/gu)) {
        if (DARK_ONLY.has(`color-${match[1]}`)) used.add(`color-${match[1]}`);
      }
    }
    expect(used.size).toBeGreaterThan(0);
    for (const name of used) expect(ISLAND_ONLY.has(name), name).toBe(true);
  });
});

describe("o tema tem um dono só: os tokens", () => {
  const walk = (dir: string): string[] =>
    readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) return entry.name === "__tests__" ? [] : walk(path);
      return /\.tsx?$/u.test(entry.name) ? [path] : [];
    });
  const shipped = walk(join(process.cwd(), "src"));
  const offenders = (pattern: RegExp) =>
    shipped.filter((path) => pattern.test(readFileSync(path, "utf8")));

  it("nenhum componente pinta com a variante dark:", () => {
    expect(offenders(/(?<![\w-])dark:[a-z]/u)).toEqual([]);
  });

  it("um preenchimento saturado usa o nome de preenchimento, que não clareia no escuro", () => {
    expect(
      offenders(/(?<![\w-])bg-(?:telha|azul-ink|verde-claro-ink|status-attention-fg|fg-subtle)(?![\w-])/u),
    ).toEqual([]);
  });

  it("um véu ou uma borda da tinta usa a tinta, que acompanha o tema", () => {
    expect(offenders(/(?<![\w-])(?:bg-verde\/|border-verde(?![\w-])|stroke-verde(?![\w-]))/u)).toEqual([]);
  });
});
