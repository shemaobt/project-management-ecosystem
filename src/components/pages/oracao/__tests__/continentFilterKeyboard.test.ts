import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { ViteDevServer } from "vite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  CHROME,
  launchChrome,
  serveProbe,
} from "../../../../__tests__/headlessChrome";

const PROBE_MODULE = `
import { createElement as h, useState } from "react";
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import i18n from "/src/i18n/index.ts";
import { ContinentFilter } from "/src/components/pages/oracao/ContinentFilter.tsx";

const groups = [
  { region: "oceania", labelKey: "continent_oceania", requests: Array.from({ length: 7 }) },
  { region: "south-america", labelKey: "continent_south_america", requests: Array.from({ length: 3 }) },
];
const changes = [];

function Wall() {
  const [continent, setContinent] = useState("all");
  return h(ContinentFilter, {
    groups,
    total: 10,
    value: continent,
    onChange: (next) => {
      changes.push(next);
      setContinent(next);
    },
  });
}

const pause = (ms) => new Promise((done) => setTimeout(done, ms));
const chip = (label) =>
  [...document.querySelectorAll('[role="radio"]')].find(
    (element) => element.firstElementChild.textContent === label,
  );

window.probe = {
  async render() {
    if (!i18n.isInitialized) await new Promise((done) => i18n.on("initialized", done));
    const root = createRoot(document.body.appendChild(document.createElement("div")));
    flushSync(() => root.render(h(Wall)));
  },
  centre(label) {
    const box = chip(label).getBoundingClientRect();
    return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  },
  tapReleasedBeforeTheMove(code) {
    for (const type of ["keydown", "keyup"]) {
      document.activeElement.dispatchEvent(
        new KeyboardEvent(type, { key: code, code, bubbles: true, cancelable: true }),
      );
    }
  },
  async read() {
    await pause(80);
    return {
      focused: document.activeElement.firstElementChild?.textContent ?? null,
      checked: document.querySelector('[role="radio"][aria-checked="true"]').firstElementChild.textContent,
      changes,
    };
  },
};
`;

const PROBE_DEPS = [
  "react",
  "react/jsx-dev-runtime",
  "react-dom",
  "react-dom/client",
  "i18next",
  "react-i18next",
  "zustand",
  "zustand/middleware",
  "class-variance-authority",
  "clsx",
  "tailwind-merge",
  "lucide-react",
  "sonner",
  "@radix-ui/react-checkbox",
  "@radix-ui/react-dialog",
  "@radix-ui/react-progress",
  "@radix-ui/react-radio-group",
  "@radix-ui/react-select",
  "@radix-ui/react-slot",
  "@radix-ui/react-switch",
  "@radix-ui/react-tabs",
];

interface Reading {
  focused: string | null;
  checked: string;
  changes: string[];
}

describe.skipIf(!CHROME)("o filtro por continente do mural, no teclado (Chrome headless)", () => {
  let scratch = "";
  let server: ViteDevServer | undefined;
  let browser: Awaited<ReturnType<typeof launchChrome>> | undefined;

  const click = async (label: string) => {
    const { x, y } = await browser!.evaluate<{ x: number; y: number }>(
      `window.probe.centre(${JSON.stringify(label)})`,
    );
    for (const type of ["mousePressed", "mouseReleased"]) {
      await browser!.send("Input.dispatchMouseEvent", {
        type,
        x,
        y,
        button: "left",
        clickCount: 1,
      });
    }
  };

  beforeAll(async () => {
    scratch = mkdtempSync(join(tmpdir(), "continent-keys-"));
    server = await serveProbe({ scratch, module: PROBE_MODULE, include: PROBE_DEPS });
    browser = await launchChrome(CHROME!, scratch);
    await browser.send("Emulation.setFocusEmulationEnabled", { enabled: true });
    await browser.open(server.resolvedUrls!.local[0]);
    await browser.evaluate("window.probe.render()");
  }, 240_000);

  afterAll(async () => {
    browser?.close();
    await server?.close();
    if (scratch) rmSync(scratch, { recursive: true, force: true });
  });

  it("clicar em Todas e apertar ArrowRight marca Pacífico e aplica o filtro", async () => {
    await click("América do Sul");
    await click("Todas");
    expect(await browser!.evaluate<Reading>("window.probe.read()")).toEqual({
      focused: "Todas",
      checked: "Todas",
      changes: ["south-america", "all"],
    });

    await browser!.evaluate(`window.probe.tapReleasedBeforeTheMove("ArrowRight")`);

    expect(await browser!.evaluate<Reading>("window.probe.read()")).toEqual({
      focused: "Pacífico",
      checked: "Pacífico",
      changes: ["south-america", "all", "oceania"],
    });
  });
});
