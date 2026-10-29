import { mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { APP_DEPENDENCIES, CHROME, compileAppCss, launchChrome, serveProbe } from "./headlessChrome";

export { CHROME };

const PROBE_MODULE = `
import { createElement as h } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import "/src/i18n/index.ts";
import { AuthProvider } from "/src/contexts/AuthContext.tsx";
import { ThemeProvider } from "/src/contexts/ThemeContext.tsx";
import { AppShell } from "/src/components/layout/AppShell.tsx";
import { ProjetosPage } from "/src/components/pages/projetos/ProjetosPage.tsx";

const frame = () => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done)));

window.frame = frame;
window.probe = {
  async mount(css, path, ready) {
    document.head.append(Object.assign(document.createElement("style"), { textContent: css }));
    createRoot(document.body.appendChild(document.createElement("div"))).render(
      h(ThemeProvider, null,
        h(AuthProvider, null,
          h(MemoryRouter, { initialEntries: [path] },
            h(Routes, null,
              h(Route, { element: h(AppShell) },
                h(Route, { index: true, element: h("div", { style: { height: "3000px" } }) }),
                h(Route, { path: "projetos", element: h(ProjetosPage) })))))),
    );
    const deadline = Date.now() + 60000;
    while (!document.querySelector(ready)) {
      if (Date.now() > deadline) throw new Error("não montou: " + ready);
      await frame();
    }
    await frame();
  },
};
`;

function sourceCandidates(): string[] {
  const src = join(process.cwd(), "src");
  return readdirSync(src, { recursive: true, encoding: "utf8" })
    .filter((path) => /\.tsx?$/u.test(path) && !path.includes("__tests__"))
    .flatMap((path) => readFileSync(join(src, path), "utf8").split(/[\s"'`]+/u));
}

export interface ShellPage {
  resize(width: number, height: number): Promise<void>;
  evaluate<T>(expression: string): Promise<T>;
  close(): Promise<void>;
}

export async function openShell(path: string, ready: string): Promise<ShellPage> {
  const scratch = mkdtempSync(join(tmpdir(), "shell-probe-"));
  const [css, server] = await Promise.all([
    compileAppCss(sourceCandidates()),
    serveProbe({
      scratch,
      module: PROBE_MODULE,
      include: APP_DEPENDENCIES,
      define: { "import.meta.env.VITE_DATA_SOURCE": JSON.stringify("fixtures") },
    }),
  ]);
  const browser = await launchChrome(CHROME!, scratch);
  await browser.open(server.resolvedUrls!.local[0]);
  await browser.evaluate(
    `window.probe.mount(${JSON.stringify(css)}, ${JSON.stringify(path)}, ${JSON.stringify(ready)})`,
  );
  return {
    async resize(width, height) {
      await browser.send("Emulation.setDeviceMetricsOverride", {
        width,
        height,
        deviceScaleFactor: 1,
        mobile: false,
      });
      await browser.evaluate("window.frame()");
    },
    evaluate: (expression) => browser.evaluate(expression),
    async close() {
      browser.close();
      await server.close();
      rmSync(scratch, { recursive: true, force: true });
    },
  };
}
