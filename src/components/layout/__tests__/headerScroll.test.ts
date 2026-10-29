import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { CHROME, openShell, type ShellPage } from "../../../__tests__/shellProbe";

const FIXED_CEILING_PX = 120;

const MEASURE = `(async () => {
  const header = document.querySelector("header");
  window.scrollTo(0, 0);
  await window.frame();
  const resting = header.getBoundingClientRect().height;
  window.scrollTo(0, 1500);
  await window.frame();
  const box = header.getBoundingClientRect();
  const root = document.documentElement;
  return {
    height: Math.round(resting),
    scrolled: Math.round(window.scrollY),
    top: Math.round(box.top),
    covered: Math.round(Math.max(0, Math.min(box.bottom, innerHeight) - Math.max(box.top, 0))),
    scrollWidth: root.scrollWidth,
    clientWidth: root.clientWidth,
    outside: [...header.querySelectorAll("button, a")]
      .filter((control) => {
        const rect = control.getBoundingClientRect();
        return rect.left < 0 || rect.right > root.clientWidth;
      })
      .map((control) => control.textContent.trim()),
  };
})()`;

interface Reading {
  height: number;
  scrolled: number;
  top: number;
  covered: number;
  scrollWidth: number;
  clientWidth: number;
  outside: string[];
}

const VIEWPORTS = [
  ["phone", 360, 740],
  ["belowSm", 639, 740],
  ["atSm", 640, 740],
  ["sideways", 740, 360],
  ["sidewaysTall", 844, 390],
  ["shortAt500", 740, 500],
  ["tallAt501", 740, 501],
  ["wide", 1280, 800],
  ["wideShort", 1280, 450],
] as const;

type Viewport = (typeof VIEWPORTS)[number][0];

describe.skipIf(!CHROME)("o cabeçalho só fica preso ao topo onde cabe (OBT-664), num navegador de verdade", () => {
  let shell: ShellPage | undefined;
  const seen = new Map<Viewport, Reading>();
  const at = (name: Viewport): Reading => {
    const reading = seen.get(name);
    if (!reading) throw new Error(`nada medido em ${name}`);
    return reading;
  };

  beforeAll(async () => {
    shell = await openShell("/", "header button");
    for (const [name, width, height] of VIEWPORTS) {
      await shell.resize(width, height);
      seen.set(name, await shell.evaluate<Reading>(MEASURE));
    }
  }, 240_000);

  afterAll(async () => {
    await shell?.close();
  });

  it("a 360px, depois de rolar, nada do cabeçalho fica no topo — a parte fixa mede 0, dentro dos 120px do PME-PRJ-517", () => {
    const { height, scrolled, covered } = at("phone");
    expect(height).toBeGreaterThan(FIXED_CEILING_PX);
    expect(scrolled).toBe(1500);
    expect(covered).toBe(0);
  });

  it("e a página continua sem rolagem lateral, com cada botão do cabeçalho inteiro na tela (PME-PRJ-501)", () => {
    const { scrollWidth, clientWidth, outside } = at("phone");
    expect(scrollWidth).toBe(clientWidth);
    expect(outside).toEqual([]);
  });

  it("o celular deitado também rola o cabeçalho junto, a 740×360 e a 844×390", () => {
    for (const name of ["sideways", "sidewaysTall"] as const) {
      expect(at(name).height, name).toBeGreaterThan(FIXED_CEILING_PX);
      expect(at(name).covered, name).toBe(0);
    }
  });

  it("o limite de largura é o sm: a 639px ainda rola, a 640px já fica no topo", () => {
    expect(at("belowSm").covered).toBe(0);
    expect(at("atSm").top).toBe(0);
    expect(at("atSm").covered).toBe(at("atSm").height);
  });

  it("o limite de altura é 500px: com 500 rola, com 501 fica no topo", () => {
    expect(at("shortAt500").covered).toBe(0);
    expect(at("tallAt501").top).toBe(0);
    expect(at("tallAt501").covered).toBe(at("tallAt501").height);
  });

  it("na tela larga ele continua preso ao topo, baixa ou não, como a barra de Projetos espera", () => {
    for (const name of ["wide", "wideShort"] as const) {
      expect(at(name).top, name).toBe(0);
      expect(at(name).covered, name).toBe(at(name).height);
    }
  });
});
