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

describe.skipIf(!CHROME)("a busca e a contagem da barra de Projetos só ficam presas na coluna lateral (OBT-664), num navegador de verdade", () => {
  let shell: ShellPage | undefined;
  const seen = new Map<Viewport, Reading>();
  const at = (name: Viewport): Reading => {
    const reading = seen.get(name);
    if (!reading) throw new Error(`nada medido em ${name}`);
    return reading;
  };

  beforeAll(async () => {
    shell = await openShell("/projetos", "aside input");
    for (const [name, width, height] of VIEWPORTS) {
      await shell.resize(width, height);
      seen.set(name, await shell.evaluate<Reading>(MEASURE));
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
});
