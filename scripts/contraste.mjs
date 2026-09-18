import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = join(ROOT, "src");
const CSS = readFileSync(join(SRC, "index.css"), "utf8");

const AA_TEXT = 4.5;
const AA_NON_TEXT = 3;

function token(name) {
  const prefix = `--${name}:`;
  const line = CSS.split("\n")
    .map((entry) => entry.trim())
    .find((entry) => entry.startsWith(prefix));
  if (!line) return null;
  const value = line.slice(prefix.length).replace(";", "").trim();
  const indirection = /^var\(--([a-z0-9-]+)\)$/u.exec(value);
  return indirection ? token(indirection[1]) : value;
}

function paint(name) {
  const value = token(`color-${name}`) ?? token(name);
  if (!value) return null;
  const wash = /^rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)$/u.exec(value);
  if (wash) {
    return { rgb: wash.slice(1, 4).map(Number), alpha: Number(wash[4]) };
  }
  if (!value.startsWith("#")) return null;
  const digits = value.slice(1);
  if (digits.length !== 6) return null;
  return {
    rgb: [0, 2, 4].map((start) => parseInt(digits.slice(start, start + 2), 16)),
    alpha: 1,
  };
}

function luminance(rgb) {
  const [red, green, blue] = rgb
    .map((value) => value / 255)
    .map((value) =>
      value <= 0.03928 ? value / 12.92 : Math.pow((value + 0.055) / 1.055, 2.4),
    );
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

function over(layer, surface) {
  return layer.alpha === 1
    ? layer.rgb
    : layer.rgb.map((value, index) =>
        Math.round(layer.alpha * value + (1 - layer.alpha) * surface[index]),
      );
}

function ratio(one, other) {
  const [lighter, darker] = [luminance(one), luminance(other)].sort(
    (a, b) => b - a,
  );
  return (lighter + 0.05) / (darker + 0.05);
}

const SURFACES = ["canvas", "elevated", "muted", "paper"];

const INKS = [
  "fg",
  "fg-strong",
  "fg-muted",
  "fg-subtle",
  "link",
  "accent",
  "accent-hover",
  "accent-press",
  "azul",
  "azul-ink",
  "verde-claro",
  "verde-claro-ink",
  "status-good-ink",
  "status-attention-fg",
  "status-attention-ink",
  "urgent",
  "tone-unknown",
  "stamp-warning",
  "deadline-soon",
  "record-health",
];

function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    return entry.isDirectory() ? walk(path) : [path];
  });
}

export function declaredMatrix() {
  const rows = [];
  for (const ink of INKS) {
    const layer = paint(ink);
    if (!layer) continue;
    for (const surface of SURFACES) {
      const base = paint(surface);
      if (!base) continue;
      rows.push({
        ink,
        surface,
        value: ratio(over(layer, base.rgb), base.rgb),
      });
    }
  }
  return rows;
}

const CLASS_STRING = /"([^"\n]*\b(?:bg|text)-[a-z][^"\n]*)"|`([^`]*\b(?:bg|text)-[a-z][^`]*)`/gu;
const FILL = /(?:^|[\s:[])bg-([a-z][a-z0-9-]*)(?![\w/-])/gu;
const INK = /(?:^|[\s:[])text-([a-z][a-z0-9-]*)(?![\w/-])/gu;

export function usedPairs() {
  const canvas = paint("canvas").rgb;
  const found = new Map();
  for (const path of walk(SRC)) {
    if (!/\.tsx?$/u.test(path) || /__tests__/u.test(path)) continue;
    for (const match of readFileSync(path, "utf8").matchAll(CLASS_STRING)) {
      const source = match[1] ?? match[2];
      const fills = [...source.matchAll(FILL)].map((entry) => entry[1]);
      const inks = [...source.matchAll(INK)].map((entry) => entry[1]);
      for (const fill of fills) {
        for (const ink of inks) {
          const surface = paint(fill);
          const layer = paint(ink);
          if (!surface || !layer) continue;
          const base = over(surface, canvas);
          const key = `${ink} on ${fill}`;
          const entry = found.get(key) ?? {
            ink,
            fill,
            value: ratio(over(layer, base), base),
            files: new Set(),
          };
          entry.files.add(relative(SRC, path));
          found.set(key, entry);
        }
      }
    }
  }
  return [...found.values()].sort((one, other) => one.value - other.value);
}

function mark(value) {
  if (value >= AA_TEXT) return "  ";
  if (value >= AA_NON_TEXT) return " ~";
  return " X";
}

function report() {
  console.log("Tinta declarada × superfície (X < 3 · ~ < 4.5)\n");
  let head = "".padEnd(22);
  for (const surface of SURFACES) head += surface.padStart(14);
  console.log(head);
  const matrix = declaredMatrix();
  for (const ink of INKS) {
    const row = matrix.filter((entry) => entry.ink === ink);
    if (row.length === 0) continue;
    let line = ink.padEnd(22);
    for (const surface of SURFACES) {
      const cell = row.find((entry) => entry.surface === surface);
      line += (cell.value.toFixed(2) + mark(cell.value)).padStart(14);
    }
    console.log(line);
  }

  const pairs = usedPairs();
  const failing = pairs.filter((entry) => entry.value < AA_TEXT);
  console.log(
    `\nPares preenchimento/tinta escritos no código: ${pairs.length} · abaixo de ${AA_TEXT}: ${failing.length}\n`,
  );
  for (const entry of failing) {
    console.log(
      `${mark(entry.value)} ${entry.value.toFixed(2).padStart(5)}  ${`${entry.ink} sobre ${entry.fill}`.padEnd(44)} ${[...entry.files].slice(0, 4).join(", ")}`,
    );
  }
  console.log(
    "\nUm par abaixo de 4.5 só é aceitável quando a tinta nunca desenha texto ali",
    "(ícone, traço, estado :hover de um controle sem rótulo colorido).",
  );
}

if (process.argv[1] === fileURLToPath(import.meta.url)) report();
