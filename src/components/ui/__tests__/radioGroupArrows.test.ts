import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { ViteDevServer } from "vite";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  CHROME,
  launchChrome,
  serveProbe,
} from "../../../__tests__/headlessChrome";

const PROBE_MODULE = `
import { createElement as h, useState } from "react";
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import { RadioButton, RadioField, RadioGroup } from "/src/components/ui/RadioGroup.tsx";

const pause = (ms) => new Promise((done) => setTimeout(done, ms));
let root = null;
let calls = {};

function Group({ name, values, initial, inForm }) {
  const [value, setValue] = useState(initial);
  const group = h(
    RadioGroup,
    {
      "aria-label": name,
      value,
      onValueChange: (next) => {
        calls[name].push(next);
        setValue(next);
      },
    },
    values.map((item) =>
      inForm
        ? h(RadioField, { key: item, id: name + "-" + item, value: item, label: item })
        : h(RadioButton, { key: item, value: item }, item),
    ),
  );
  return inForm ? h("form", null, group) : group;
}

const radio = (name, value) =>
  document.querySelector('[aria-label="' + name + '"] [role="radio"][value="' + value + '"]');

const key = (type, code) =>
  document.activeElement.dispatchEvent(
    new KeyboardEvent(type, { key: code, code, bubbles: true, cancelable: true }),
  );

window.probe = {
  render() {
    root?.unmount();
    calls = { solto: [], formulario: [], sozinho: [] };
    root = createRoot(document.body.appendChild(document.createElement("div")));
    flushSync(() =>
      root.render(
        h("div", null, [
          h(Group, { key: "solto", name: "solto", values: ["a", "b", "c"], initial: "a" }),
          h(Group, { key: "formulario", name: "formulario", values: ["a", "b", "c"], initial: "a", inForm: true }),
          h(Group, { key: "sozinho", name: "sozinho", values: ["x"], initial: undefined }),
        ]),
      ),
    );
  },
  focus(name, value) {
    radio(name, value).focus();
  },
  blur() {
    document.activeElement.blur();
  },
  tap(code) {
    key("keydown", code);
    key("keyup", code);
  },
  down(code) {
    key("keydown", code);
  },
  up(code) {
    key("keyup", code);
  },
  async settle() {
    await pause(80);
  },
  read(name) {
    const checked = document.querySelector('[aria-label="' + name + '"] [role="radio"][aria-checked="true"]');
    return {
      focused: document.activeElement?.getAttribute("value") ?? null,
      checked: checked?.getAttribute("value") ?? null,
      calls: calls[name],
    };
  },
};
`;

const PROBE_DEPS = [
  "react",
  "react/jsx-dev-runtime",
  "react-dom",
  "react-dom/client",
  "@radix-ui/react-radio-group",
  "class-variance-authority",
  "clsx",
  "tailwind-merge",
];

interface Reading {
  focused: string | null;
  checked: string | null;
  calls: string[];
}

describe.skipIf(!CHROME)("a seta no grupo de escolha única (Chrome headless)", () => {
  let scratch = "";
  let server: ViteDevServer | undefined;
  let browser: Awaited<ReturnType<typeof launchChrome>> | undefined;
  const run = <T>(expression: string) => browser!.evaluate<T>(expression);
  const read = (group: string) => run<Reading>(`window.probe.read(${JSON.stringify(group)})`);

  beforeAll(async () => {
    scratch = mkdtempSync(join(tmpdir(), "radio-arrows-"));
    server = await serveProbe({ scratch, module: PROBE_MODULE, include: PROBE_DEPS });
    browser = await launchChrome(CHROME!, scratch);
    await browser.send("Emulation.setFocusEmulationEnabled", { enabled: true });
    await browser.open(server.resolvedUrls!.local[0]);
  }, 240_000);

  afterAll(async () => {
    browser?.close();
    await server?.close();
    if (scratch) rmSync(scratch, { recursive: true, force: true });
  });

  beforeEach(async () => {
    await run("window.probe.render()");
  });

  it.each(["solto", "formulario"])(
    "a seta marca o vizinho mesmo quando a tecla sobe antes de o foco chegar (%s)",
    async (group) => {
      await run(`window.probe.focus(${JSON.stringify(group)}, "a")`);
      await run(`window.probe.tap("ArrowRight")`);
      await run("window.probe.settle()");

      expect(await read(group)).toEqual({ focused: "b", checked: "b", calls: ["b"] });
    },
  );

  it.each(["solto", "formulario"])(
    "com a tecla ainda abaixada quando o foco chega, a seta marca o vizinho uma vez só (%s)",
    async (group) => {
      await run(`window.probe.focus(${JSON.stringify(group)}, "a")`);
      await run(`window.probe.down("ArrowRight")`);
      await run("window.probe.settle()");
      await run(`window.probe.up("ArrowRight")`);

      expect(await read(group)).toEqual({ focused: "b", checked: "b", calls: ["b"] });
    },
  );

  it("uma seta que não leva o foco a lugar nenhum não marca nada depois", async () => {
    await run(`window.probe.focus("sozinho", "x")`);
    await run(`window.probe.tap("ArrowRight")`);
    await run("window.probe.settle()");
    await run("window.probe.blur()");
    await run(`window.probe.focus("sozinho", "x")`);
    await run("window.probe.settle()");

    expect(await read("sozinho")).toEqual({ focused: "x", checked: null, calls: [] });
  });
});
