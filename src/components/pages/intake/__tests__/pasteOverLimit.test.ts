import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { ViteDevServer } from "vite";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { CHROME, launchChrome, serveProbe } from "../../../../__tests__/headlessChrome";
import type { IntakeField, IntakeForm } from "../../../../types/forms";
import { IntakeFormView } from "../IntakeFormView";

const { default: i18n } = await import("../../../../i18n");

beforeEach(async () => {
  await i18n.changeLanguage("pt");
});

const FIELDS: readonly IntakeField[] = [
  {
    key: "submittedBy",
    type: "text",
    required: true,
    labelKey: "forms_q_submitted_by",
    maxLength: 200,
    options: [],
  },
  {
    key: "period",
    type: "period",
    required: true,
    labelKey: "forms_q_period",
    maxLength: null,
    options: [],
  },
  {
    key: "voice",
    type: "longText",
    required: false,
    labelKey: "forms_q_voice",
    maxLength: 4000,
    options: [],
  },
];

const FORM: IntakeForm = {
  kind: "pulso",
  definitionVersion: 1,
  languageName: "Guarani Mbyá",
  expiresAt: "2026-11-30",
  fields: FIELDS,
};

const noop = () => undefined;

const render = (answers: Record<string, unknown>) =>
  renderToStaticMarkup(
    createElement(IntakeFormView, {
      form: FORM,
      answers,
      onAnswerChange: noop,
      fieldErrors: {},
      generalError: null,
      reloadNeeded: false,
      submitting: false,
      draftRestored: false,
      onSubmit: noop,
    }),
  );

describe("o campo não corta o que se cola — o limite é dito, não imposto (OBT-624)", () => {
  it("nenhum campo de texto do Pulso leva maxlength — o navegador não tem onde cortar", () => {
    const markup = render({ submittedBy: "Kuaray", voice: "curto" });
    expect(markup).toContain("<textarea");
    expect(markup).toContain('type="text"');
    expect(markup).not.toMatch(/maxlength/iu);
  });

  it("acima do limite o texto fica inteiro, o contador diz 4001/4000 e a frase aparece no campo, anunciada e ligada a ele", () => {
    const markup = render({ voice: "v".repeat(4001) });
    expect(markup).toContain("v".repeat(4001));
    expect(markup).toContain("4001/4000");
    expect(markup).toContain(i18n.t("intake_err_too_long"));
    expect(markup).toContain('aria-invalid="true"');

    const alert = markup.match(/<p id="([^"]+)" role="alert"[^>]*>([^<]*)<\/p>/u);
    expect(alert?.[2]).toBe(i18n.t("intake_err_too_long"));
    const textarea = markup.match(/<textarea[^>]*>/u)![0];
    expect(textarea).toContain(`aria-describedby="${alert![1]}"`);
  });

  it("no limite exato cabe: 4000/4000 e nenhuma frase", () => {
    const markup = render({ voice: "v".repeat(4000) });
    expect(markup).toContain("4000/4000");
    expect(markup).not.toContain(i18n.t("intake_err_too_long"));
    expect(markup).not.toContain("aria-invalid");
  });

  it("o nome com 201 é marcado também, mesmo sem contador", () => {
    const markup = render({ submittedBy: "n".repeat(201) });
    expect(markup).toContain(i18n.t("intake_err_too_long"));
    expect(markup).not.toContain("/200");
  });
});

const PT = JSON.parse(
  readFileSync(join(process.cwd(), "src/i18n/locales/pt-BR.json"), "utf8"),
) as Record<string, string>;

const DEPENDENCIES = Object.keys(
  (
    JSON.parse(readFileSync(join(process.cwd(), "package.json"), "utf8")) as {
      dependencies: Record<string, string>;
    }
  ).dependencies,
);

const TOKEN = "colar-acima-do-limite";

const PROBE_MODULE = `
import { createElement } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import i18n from "/src/i18n/index.ts";
import { IntakePage } from "/src/components/pages/intake/index.tsx";

const pause = (ms) => new Promise((done) => setTimeout(done, ms));
const inputs = [];
const heard = new WeakSet();

function field(label) {
  const owner = [...document.querySelectorAll("label")].find((node) =>
    node.textContent.trim().startsWith(label),
  );
  if (!owner) throw new Error("sem campo: " + label);
  return document.getElementById(owner.htmlFor);
}

window.probe = {
  async until(check, what) {
    const deadline = Date.now() + 30000;
    while (!check()) {
      if (Date.now() > deadline) throw new Error("nunca aconteceu: " + what);
      await pause(20);
    }
  },
  async mount(token) {
    await i18n.changeLanguage("pt");
    const root = createRoot(document.body.appendChild(document.createElement("div")));
    root.render(
      createElement(
        MemoryRouter,
        { initialEntries: ["/intake/" + token] },
        createElement(
          Routes,
          null,
          createElement(Route, { path: "/intake/:token", element: createElement(IntakePage) }),
        ),
      ),
    );
    await this.until(() => document.querySelector("textarea"), "o formulário do link");
  },
  fill(label, value) {
    const target = field(label);
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
    setter.call(target, value);
    target.dispatchEvent(new Event("input", { bubbles: true }));
  },
  stage(text) {
    const source = document.body.appendChild(document.createElement("textarea"));
    source.id = "origem-da-colagem";
    source.value = text;
    source.focus();
    source.select();
  },
  aim(label) {
    document.getElementById("origem-da-colagem").remove();
    const target = field(label);
    inputs.length = 0;
    if (!heard.has(target)) {
      heard.add(target);
      target.addEventListener("input", (event) =>
        inputs.push({ trusted: event.isTrusted, type: event.inputType }),
      );
    }
    target.focus();
    target.select();
  },
  pasted() {
    return this.until(
      () => inputs.some((input) => input.type === "insertFromPaste"),
      "a colagem chegar ao campo",
    );
  },
  submit() {
    document.querySelector('button[type="submit"]').click();
  },
  read(label) {
    const target = field(label);
    return {
      length: target.value.length,
      invalid: target.getAttribute("aria-invalid"),
      text: document.body.innerText,
      inputs: [...inputs],
    };
  },
};
`;

interface Reading {
  length: number;
  invalid: string | null;
  text: string;
  inputs: { trusted: boolean; type: string }[];
}

interface Post {
  url: string;
  body: string;
}

describe.skipIf(!CHROME)("colar 4001 em voz num navegador de verdade (headless Chrome)", () => {
  let scratch = "";
  let server: ViteDevServer | undefined;
  let browser: Awaited<ReturnType<typeof launchChrome>> | undefined;
  const posts: Post[] = [];
  const seen: {
    pasted?: Reading;
    refused?: Reading;
    postsWhenRefused?: number;
    fitting?: Reading;
  } = {};

  const voice = PT.forms_q_voice;

  beforeAll(async () => {
    scratch = mkdtempSync(join(tmpdir(), "intake-paste-"));
    server = await serveProbe({
      scratch,
      module: PROBE_MODULE,
      include: [
        ...DEPENDENCIES,
        "react/jsx-runtime",
        "react/jsx-dev-runtime",
        "react-dom/client",
        "zustand/middleware",
      ],
      define: {
        "import.meta.env.VITE_DATA_SOURCE": JSON.stringify("api"),
        "import.meta.env.VITE_API_BASE_URL": JSON.stringify("/api"),
      },
      middleware: (request, response, next) => {
        const url = request.url ?? "";
        if (!url.startsWith("/api/")) return next();
        if (request.method === "POST") {
          let body = "";
          request.on("data", (chunk: Buffer) => (body += chunk.toString()));
          request.on("end", () => {
            posts.push({ url, body });
            response.statusCode = 202;
            response.end();
          });
          return;
        }
        if (request.method === "GET" && url === `/api/shema/intake/${TOKEN}`) {
          response.setHeader("content-type", "application/json");
          response.end(JSON.stringify(FORM));
          return;
        }
        response.statusCode = 404;
        response.end();
      },
    });
    browser = await launchChrome(CHROME!, scratch);
    const page = browser;

    const chord = async (key: "c" | "v") => {
      const code = key.toUpperCase().charCodeAt(0);
      for (const type of ["rawKeyDown", "keyUp"]) {
        await page.send("Input.dispatchKeyEvent", {
          type,
          modifiers: 2,
          key,
          code: `Key${key.toUpperCase()}`,
          windowsVirtualKeyCode: code,
          nativeVirtualKeyCode: code,
        });
      }
    };
    const paste = async (label: string, text: string) => {
      await page.evaluate(`window.probe.stage(${JSON.stringify(text)})`);
      await chord("c");
      await page.evaluate(`window.probe.aim(${JSON.stringify(label)})`);
      await chord("v");
    };
    const read = () => page.evaluate<Reading>(`window.probe.read(${JSON.stringify(voice)})`);
    const waitForEither = (...texts: string[]) =>
      page.evaluate(
        `window.probe.until(() => ${JSON.stringify(texts)}.some((text) => document.body.innerText.includes(text)), ${JSON.stringify(texts.join(" ou "))})`,
      );

    await page.open(server.resolvedUrls!.local[0]);
    await page.evaluate(`window.probe.mount(${JSON.stringify(TOKEN)})`);
    await page.evaluate(`window.probe.fill(${JSON.stringify(PT.forms_q_submitted_by)}, "Kuaray")`);
    await page.evaluate(`window.probe.fill(${JSON.stringify(PT.forms_q_period)}, "2026-10")`);

    await paste(voice, "v".repeat(4001));
    await page.evaluate("window.probe.pasted()");
    seen.pasted = await read();

    await page.evaluate("window.probe.submit()");
    await waitForEither(PT.intake_form_check_answers, PT.intake_success_title);
    seen.postsWhenRefused = posts.length;
    if (posts.length > 0) return;
    seen.refused = await read();

    await paste(voice, "v".repeat(4000));
    await page.evaluate("window.probe.pasted()");
    seen.fitting = await read();

    await page.evaluate("window.probe.submit()");
    await waitForEither(PT.intake_success_title);
  }, 240_000);

  afterAll(async () => {
    browser?.close();
    await server?.close();
    if (scratch) rmSync(scratch, { recursive: true, force: true });
  });

  it("a voz recebe uma colagem de verdade, não um valor posto por código", () => {
    expect(seen.pasted!.inputs).toContainEqual({ trusted: true, type: "insertFromPaste" });
  });

  it("colar 4001 em voz guarda os 4001 e mostra 4001/4000 e a frase, antes do Enviar", () => {
    expect(seen.pasted!.length).toBe(4001);
    expect(seen.pasted!.text).toContain("4001/4000");
    expect(seen.pasted!.text).toContain(PT.intake_err_too_long);
    expect(seen.pasted!.invalid).toBe("true");
  });

  it("o Enviar com a voz acima do limite não manda POST nenhum, e a frase continua no campo", () => {
    expect(seen.postsWhenRefused).toBe(0);
    expect(seen.refused!.length).toBe(4001);
    expect(seen.refused!.text).toContain(PT.intake_err_too_long);
    expect(seen.refused!.text).toContain(PT.intake_form_check_answers);
  });

  it("com 4000 o mesmo Enviar sai — o teste enxerga o POST quando há POST", () => {
    expect(seen.fitting!.length).toBe(4000);
    expect(seen.fitting!.text).not.toContain(PT.intake_err_too_long);
    expect(posts).toHaveLength(1);
    expect(posts[0].url).toBe(`/api/shema/intake/${TOKEN}`);
    const { answers } = JSON.parse(posts[0].body) as { answers: Record<string, string> };
    expect(answers.voice).toHaveLength(4000);
    expect(answers.submittedBy).toBe("Kuaray");
  });
});
