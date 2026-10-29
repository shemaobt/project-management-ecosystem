import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { CHROME, openShell, type ShellPage } from "../../../../__tests__/shellProbe";

const MEASURE = `(async () => {
  const aside = document.querySelector("aside");
  const block = aside.firstElementChild;
  window.scrollTo(0, 0);
  aside.scrollTop = 0;
  await window.frame();
  const height = block.getBoundingClientRect().height;
  const asideBox = aside.getBoundingClientRect();
  const scrolls = aside.scrollHeight > aside.clientHeight + 1;
  if (scrolls) aside.scrollTop = (aside.scrollHeight - aside.clientHeight) / 2;
  else window.scrollTo(0, asideBox.top + window.scrollY + asideBox.height / 2);
  await window.frame();
  const box = block.getBoundingClientRect();
  const holder = scrolls ? aside.getBoundingClientRect().top : 0;
  return {
    height: Math.round(height),
    ownScroll: scrolls,
    moved: Math.round(scrolls ? aside.scrollTop : window.scrollY),
    stuck: Math.round(box.top) === Math.round(holder),
    covered: Math.round(Math.max(0, Math.min(box.bottom, innerHeight) - Math.max(box.top, holder))),
  };
})()`;

const UNDER_HEADER = `(async () => {
  const aside = document.querySelector("aside");
  const block = aside.firstElementChild;
  aside.scrollTop = 0;
  window.scrollTo(0, 1500);
  await window.frame();
  aside.scrollTop = (aside.scrollHeight - aside.clientHeight) / 2;
  await window.frame();
  const header = document.querySelector("header").getBoundingClientRect();
  const box = block.getBoundingClientRect();
  const side = aside.getBoundingClientRect();
  return {
    scrolled: Math.round(window.scrollY),
    headerBottom: Math.round(header.bottom),
    blockTop: Math.round(box.top),
    blockBottom: Math.round(box.bottom),
    asideBottom: Math.round(side.bottom),
    viewport: innerHeight,
  };
})()`;

interface UnderHeader {
  scrolled: number;
  headerBottom: number;
  blockTop: number;
  blockBottom: number;
  asideBottom: number;
  viewport: number;
}

interface Reading {
  height: number;
  ownScroll: boolean;
  moved: number;
  stuck: boolean;
  covered: number;
}

const VIEWPORTS = [
  ["phone", 360, 740],
  ["sideways", 740, 360],
  ["belowLg", 1023, 800],
  ["wide", 1280, 800],
] as const;

type Viewport = (typeof VIEWPORTS)[number][0];

const DESKTOPS = [
  ["laptop", 1366, 900],
  ["fullHd", 1920, 1080],
] as const;

type Desktop = (typeof DESKTOPS)[number][0];

describe.skipIf(!CHROME)("a busca e a contagem da barra de Projetos só ficam presas na coluna lateral (OBT-664), num navegador de verdade", () => {
  let shell: ShellPage | undefined;
  const seen = new Map<Viewport, Reading>();
  const at = (name: Viewport): Reading => {
    const reading = seen.get(name);
    if (!reading) throw new Error(`nada medido em ${name}`);
    return reading;
  };

  const under = new Map<Desktop, UnderHeader>();
  const below = (name: Desktop): UnderHeader => {
    const reading = under.get(name);
    if (!reading) throw new Error(`nada medido em ${name}`);
    return reading;
  };

  beforeAll(async () => {
    shell = await openShell("/projetos", "aside input");
    for (const [name, width, height] of VIEWPORTS) {
      await shell.resize(width, height);
      seen.set(name, await shell.evaluate<Reading>(MEASURE));
    }
    for (const [name, width, height] of DESKTOPS) {
      await shell.resize(width, height);
      under.set(name, await shell.evaluate<UnderHeader>(UNDER_HEADER));
    }
  }, 240_000);

  afterAll(async () => {
    await shell?.close();
  });

  it("a 360×740, no meio dos filtros, nada do bloco fica preso no topo", () => {
    const { height, moved, stuck, covered } = at("phone");
    expect(height).toBeGreaterThan(120);
    expect(moved).toBeGreaterThan(height);
    expect(stuck).toBe(false);
    expect(covered).toBe(0);
  });

  it("deitado (740×360) também não", () => {
    expect(at("sideways").stuck).toBe(false);
    expect(at("sideways").covered).toBe(0);
  });

  it("o limite é o lg, onde a barra vira coluna: a 1023px o bloco ainda rola", () => {
    expect(at("belowLg").ownScroll).toBe(false);
    expect(at("belowLg").covered).toBe(0);
  });

  it("a 1280×800 a barra rola por dentro e o bloco segue preso no alto dela", () => {
    const { ownScroll, moved, stuck, covered, height } = at("wide");
    expect(ownScroll).toBe(true);
    expect(moved).toBeGreaterThan(0);
    expect(stuck).toBe(true);
    expect(covered).toBe(height);
  });

  it("com a página rolada, a busca da barra fica inteira logo abaixo do cabeçalho de duas linhas (1366×900) e de uma (1920×1080)", () => {
    expect(below("laptop").headerBottom).toBeGreaterThan(below("fullHd").headerBottom);
    for (const name of ["laptop", "fullHd"] as const) {
      const { scrolled, headerBottom, blockTop, blockBottom, asideBottom, viewport } = below(name);
      expect(scrolled, name).toBe(1500);
      expect(blockTop, name).toBeGreaterThanOrEqual(headerBottom);
      expect(blockTop - headerBottom, name).toBeLessThanOrEqual(4);
      expect(blockBottom, name).toBeLessThanOrEqual(viewport);
      expect(asideBottom, name).toBeLessThanOrEqual(viewport);
    }
  });
});
