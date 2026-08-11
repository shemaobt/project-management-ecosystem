import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync(new URL("../../index.css", import.meta.url), "utf8");

const HUE_TOLERANCE = 6;
const AA_SMALL_TEXT = 4.5;

function token(name: string): string {
  const prefix = `--${name}:`;
  const line = css
    .split("\n")
    .map((entry) => entry.trim())
    .find((entry) => entry.startsWith(prefix));
  if (!line) throw new Error(name);
  return line.slice(prefix.length).replace(";", "").trim();
}

function channels(name: string): number[] {
  const digits = token(name).slice(1);
  return [0, 2, 4].map((start) => parseInt(digits.slice(start, start + 2), 16));
}

function hue(name: string): number {
  const [red, green, blue] = channels(name).map((value) => value / 255);
  const max = Math.max(red, green, blue);
  const span = max - Math.min(red, green, blue);
  if (span === 0) return 0;
  const sector =
    max === red
      ? ((green - blue) / span) % 6
      : max === green
        ? (blue - red) / span + 2
        : (red - green) / span + 4;
  return (sector * 60 + 360) % 360;
}

function luminance(name: string): number {
  const [red, green, blue] = channels(name)
    .map((value) => value / 255)
    .map((value) =>
      value <= 0.03928
        ? value / 12.92
        : Math.pow((value + 0.055) / 1.055, 2.4),
    );
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

function contrast(foreground: string, background: string): number {
  const [lighter, darker] = [luminance(foreground), luminance(background)].sort(
    (a, b) => b - a,
  );
  return (lighter + 0.05) / (darker + 0.05);
}

describe("um segundo valor de uma cor da paleta é peso de tinta, não cor nova", () => {
  const inkPairs: { ink: string; base: string }[] = [
    { ink: "azul-ink", base: "shema-azul" },
    { ink: "accent-hover", base: "shema-telha" },
    { ink: "accent-press", base: "shema-telha" },
    { ink: "status-attention-fg", base: "status-attention" },
    { ink: "deadline-soon", base: "status-attention" },
  ];

  for (const pair of inkPairs) {
    it(`${pair.ink} fica na matiz de ${pair.base}`, () => {
      expect(Math.abs(hue(pair.ink) - hue(pair.base))).toBeLessThan(
        HUE_TOLERANCE,
      );
    });
  }
});

describe("o rótulo azul dos anéis de progresso", () => {
  it("usa a tinta porque o azul da paleta não passa em texto sobre bg-muted", () => {
    expect(contrast("shema-azul", "bg-muted")).toBeLessThan(AA_SMALL_TEXT);
    expect(contrast("azul-ink", "bg-muted")).toBeGreaterThanOrEqual(
      AA_SMALL_TEXT,
    );
  });
});
