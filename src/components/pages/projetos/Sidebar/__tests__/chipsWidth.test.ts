import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { compile } from "tailwindcss";
import type { ViteDevServer } from "vite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { CHROME, launchChrome, serveProbe } from "../../../../../__tests__/headlessChrome";

/** The 2×2 block of the four preset chips before OBT-665, measured at 1366×900: 39 + 6 + 39. */
const BLOCK_BEFORE_PX = 84;
const SIDEBAR_INNER_PX = 254;

const PROBE_MODULE = `
import { createElement as h } from "react";
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import "/src/i18n/index.ts";
import { Chips } from "/src/components/pages/projetos/Sidebar/Chips.tsx";

window.probe = {
  async render(css) {
    const style = document.createElement("style");
    style.textContent = css;
    document.head.appendChild(style);
    const host = document.body.appendChild(document.createElement("aside"));
    host.style.width = "${SIDEBAR_INNER_PX}px";
    flushSync(() =>
      createRoot(host).render(h(Chips, { counts: { attention: 16, prayer: 3, celebrate: 10, recent: 2 } })),
    );
    await document.fonts.ready;
    await new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done)));
    const chips = [...host.querySelectorAll("button[aria-pressed]")];
    const box = (el) => el.getBoundingClientRect();
    return {
      font: getComputedStyle(chips[0]).fontFamily,
      cut: chips.filter((el) => {
        const label = el.querySelector("span.flex-1");
        return label.scrollWidth > label.clientWidth || label.scrollHeight > label.clientHeight + 1;
      }).length,
      perRow: chips.filter((el) => Math.round(box(el).top) === Math.round(box(chips[0]).top)).length,
      block: Math.round(box(chips[chips.length - 1]).bottom - box(chips[0]).top),
    };
  },
};
`;

async function appCss(): Promise<string> {
  const source = readFileSync(join(process.cwd(), "src/index.css"), "utf8").replaceAll(
    'url("/fonts/',
    'url("/public/fonts/',
  );
  const tailwind = readFileSync(join(process.cwd(), "node_modules/tailwindcss/index.css"), "utf8");
  const compiler = await compile(source, {
    base: process.cwd(),
    loadStylesheet: async (id, base) => {
      if (id !== "tailwindcss") throw new Error(`stylesheet inesperado: ${id}`);
      return { path: id, base, content: tailwind };
    },
  });
  const chips = readFileSync(
    join(process.cwd(), "src/components/pages/projetos/Sidebar/Chips.tsx"),
    "utf8",
  );
  return compiler.build([...new Set(chips.split(/[\s"'`{}]+/u))]);
}

describe.skipIf(!CHROME)("os chips de atalho na barra de 260px, num navegador (OBT-665)", () => {
  let scratch = "";
  let server: ViteDevServer | undefined;
  let browser: Awaited<ReturnType<typeof launchChrome>> | undefined;
  let measured: { font: string; cut: number; perRow: number; block: number };

  beforeAll(async () => {
    scratch = mkdtempSync(join(tmpdir(), "chips-"));
    const [css, dev] = await Promise.all([
      appCss(),
      serveProbe({
        scratch,
        module: PROBE_MODULE,
        include: ["react", "react/jsx-dev-runtime", "react-dom", "react-dom/client", "react-i18next", "i18next", "zustand", "zustand/middleware", "lucide-react", "clsx", "tailwind-merge"],
      }),
    ]);
    server = dev;
    browser = await launchChrome(CHROME!, scratch);
    await browser.send("Emulation.setDeviceMetricsOverride", {
      width: 1366,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false,
    });
    await browser.open(server.resolvedUrls!.local[0]);
    measured = await browser.evaluate(`window.probe.render(${JSON.stringify(css)})`);
  }, 240_000);

  afterAll(async () => {
    browser?.close();
    await server?.close();
    if (scratch) rmSync(scratch, { recursive: true, force: true });
  });

  it("mede com a Montserrat da casa, não com a fonte de reserva", () => {
    expect(measured.font).toContain("Montserrat");
  });

  it("os quatro rótulos saem inteiros, dois chips por linha (PME-PRJ-098)", () => {
    expect(measured.cut).toBe(0);
    expect(measured.perRow).toBe(2);
  });

  it("o bloco não fica mais alto que o 2×2 de antes do lote, e 'Filtros ativos' segue à vista (PME-PRJ-015)", () => {
    expect(measured.block).toBeLessThanOrEqual(BLOCK_BEFORE_PX);
  });
});
