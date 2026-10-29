import { mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { ViteDevServer } from "vite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  APP_DEPENDENCIES,
  CHROME,
  compileAppCss,
  launchChrome,
  serveProbe,
} from "../../../__tests__/headlessChrome";

const FIXED_CEILING_PX = 120;

const PROBE_MODULE = `
import { createElement as h } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import "/src/i18n/index.ts";
import { AuthProvider } from "/src/contexts/AuthContext.tsx";
import { ThemeProvider } from "/src/contexts/ThemeContext.tsx";
import { AppShell } from "/src/components/layout/AppShell.tsx";

const frame = () => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done)));

window.probe = {
  async mount(css) {
    document.head.append(Object.assign(document.createElement("style"), { textContent: css }));
    const page = h("div", { style: { height: "3000px" } });
    createRoot(document.body.appendChild(document.createElement("div"))).render(
      h(ThemeProvider, null,
        h(AuthProvider, null,
          h(MemoryRouter, null,
            h(Routes, null, h(Route, { element: h(AppShell) }, h(Route, { index: true, element: page })))))),
    );
    const deadline = Date.now() + 30000;
    while (document.querySelectorAll("header button").length < 5) {
      if (Date.now() > deadline) throw new Error("o cabeçalho não montou");
      await frame();
    }
  },
  async measure() {
    const header = document.querySelector("header");
    window.scrollTo(0, 0);
    await frame();
    const resting = header.getBoundingClientRect().height;
    window.scrollTo(0, 1500);
    await frame();
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
  },
};
`;

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

function sourceCandidates(): string[] {
  const src = join(process.cwd(), "src");
  return readdirSync(src, { recursive: true, encoding: "utf8" })
    .filter((path) => /\.tsx?$/u.test(path) && !path.includes("__tests__"))
    .flatMap((path) => readFileSync(join(src, path), "utf8").split(/[\s"'`]+/u));
}

describe.skipIf(!CHROME)("o cabeçalho só fica preso ao topo onde cabe (OBT-664), num navegador de verdade", () => {
  let scratch = "";
  let server: ViteDevServer | undefined;
  let browser: Awaited<ReturnType<typeof launchChrome>> | undefined;
  const seen = new Map<Viewport, Reading>();
  const at = (name: Viewport): Reading => {
    const reading = seen.get(name);
    if (!reading) throw new Error(`nada medido em ${name}`);
    return reading;
  };

  beforeAll(async () => {
    scratch = mkdtempSync(join(tmpdir(), "header-scroll-"));
    const [css, dev] = await Promise.all([
      compileAppCss(sourceCandidates()),
      serveProbe({
        scratch,
        module: PROBE_MODULE,
        include: APP_DEPENDENCIES,
        define: { "import.meta.env.VITE_DATA_SOURCE": JSON.stringify("fixtures") },
      }),
    ]);
    server = dev;
    browser = await launchChrome(CHROME!, scratch);
    await browser.open(server.resolvedUrls!.local[0]);
    await browser.evaluate(`window.probe.mount(${JSON.stringify(css)})`);
    for (const [name, width, height] of VIEWPORTS) {
      await browser.send("Emulation.setDeviceMetricsOverride", {
        width,
        height,
        deviceScaleFactor: 1,
        mobile: false,
      });
      seen.set(name, await browser.evaluate<Reading>("window.probe.measure()"));
    }
  }, 240_000);

  afterAll(async () => {
    browser?.close();
    await server?.close();
    if (scratch) rmSync(scratch, { recursive: true, force: true });
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
