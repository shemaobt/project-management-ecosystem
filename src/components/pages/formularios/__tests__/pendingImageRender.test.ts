import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { ViteDevServer } from "vite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { APP_DEPENDENCIES, CHROME, launchChrome, serveProbe } from "../../../../__tests__/headlessChrome";

const PT = JSON.parse(
  readFileSync(join(process.cwd(), "src/i18n/locales/pt-BR.json"), "utf8"),
) as Record<string, string>;

/** A real 1×1 PNG, so the browser decodes it and `onLoad` fires. */
const PNG =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";

const PROBE_MODULE = `
import { StrictMode, createElement as h } from "react";
import { createRoot } from "react-dom/client";
import i18n from "/src/i18n/index.ts";
import { ReceivedArchive } from "/src/components/pages/formularios/ReceivedArchive.tsx";

const pause = (ms) => new Promise((done) => setTimeout(done, ms));
const row = (id, languageName) => ({
  id, kind: "pulso", projectId: "p-" + id, languageName, submittedBy: "Líder " + id,
  receivedAt: "2026-10-30", definitionVersion: 1, appliedAt: null,
});
const submissions = [
  row("servida", "Língua Servida"),
  row("naoautorizada", "Língua Sem Autorização"),
  row("recusada403", "Língua Recusada 403"),
  row("recusada404", "Língua Recusada 404"),
];
const FIELDS = [
  { key: "image", type: "image", required: false, labelKey: "forms_q_image", maxLength: null, options: [] },
  { key: "imageAuthorized", type: "checkbox", required: false, labelKey: "forms_q_image_authorization", maxLength: null, options: [] },
];
const served = { servida: true, naoautorizada: false, recusada403: true, recusada404: true };
const readSubmission = async (id) => ({
  ...submissions.find((entry) => entry.id === id),
  fields: FIELDS,
  answers: { image: "intake-" + id, imageAuthorized: id !== "naoautorizada" },
  answersWithheld: false,
  pendingImage: served[id],
});
const refusal = (status) => Object.assign(new Error("refused"), {
  isAxiosError: true,
  response: { status, data: { detail: status === 403 ? "This item is not shared with that audience" : "File not found" } },
});
const asked = {};
const pendingImageLink = async (id) => {
  asked[id] = (asked[id] ?? 0) + 1;
  if (id === "recusada403") throw refusal(403);
  if (id === "recusada404") throw refusal(404);
  return { url: "${PNG}", expiresInMinutes: 15 };
};

const item = (name) =>
  [...document.querySelectorAll("li")].find((node) => node.textContent.includes(name));
const button = (name) => item(name).querySelector("button");

window.probe = {
  async until(check, what) {
    const deadline = Date.now() + 30000;
    while (!check()) {
      if (Date.now() > deadline) throw new Error("nunca aconteceu: " + what);
      await pause(20);
    }
  },
  async mount() {
    await i18n.changeLanguage("pt");
    const root = createRoot(document.body.appendChild(document.createElement("div")));
    root.render(h(StrictMode, null, h(ReceivedArchive, { submissions, readSubmission, pendingImageLink })));
    await this.until(() => document.querySelectorAll("li").length === 4, "as quatro linhas");
  },
  async open(name) {
    button(name).click();
    await this.until(() => item(name).querySelector("dl"), "as respostas de " + name);
  },
  async close(name) {
    button(name).click();
    await this.until(() => !item(name).querySelector("dl"), "fechar " + name);
  },
  async loaded(name) {
    await this.until(() => item(name).querySelector("img")?.complete && item(name).querySelector("img").naturalWidth > 0, "a foto de " + name);
  },
  async settle() { await pause(300); },
  read(name) {
    const scope = item(name);
    const img = scope.querySelector("img");
    return {
      img: img ? { src: img.getAttribute("src"), alt: img.getAttribute("alt"), width: img.naturalWidth } : null,
      slot: scope.querySelector("[data-photo-link]") !== null,
      emptySlot: scope.querySelector("[data-photo-link] > div") !== null,
      imageAnswer: scope.querySelector("dd").innerText.trim(),
      asked: asked[submissions.find((entry) => entry.languageName === name).id] ?? 0,
    };
  },
  storage() {
    return JSON.stringify({ ...localStorage, ...sessionStorage });
  },
};
`;

type Reading = {
  img: { src: string; alt: string; width: number } | null;
  slot: boolean;
  emptySlot: boolean;
  imageAnswer: string;
  asked: number;
};

describe.skipIf(!CHROME)("a caixa de entrada mostra a foto do Pulso pendente — num navegador de verdade (OBT-674)", () => {
  let scratch: string | undefined;
  let server: ViteDevServer | undefined;
  let browser: Awaited<ReturnType<typeof launchChrome>> | undefined;
  const seen: Record<string, Reading> = {};
  const asked: { afterOthers?: number; afterReopen?: number; first?: number } = {};
  let storage = "";

  beforeAll(async () => {
    scratch = mkdtempSync(join(tmpdir(), "foto-pendente-"));
    server = await serveProbe({
      scratch,
      module: PROBE_MODULE,
      include: APP_DEPENDENCIES,
      define: { "import.meta.env.VITE_DATA_SOURCE": JSON.stringify("fixtures") },
    });
    browser = await launchChrome(CHROME!, scratch);
    const page = browser;
    const call = (expression: string) => page.evaluate(`window.probe.${expression}`);
    const read = (name: string) => page.evaluate<Reading>(`window.probe.read(${JSON.stringify(name)})`);

    await page.open(server.resolvedUrls!.local[0]);
    await call("mount()");
    await call('open("Língua Servida")');
    await call('loaded("Língua Servida")');
    asked.first = (await read("Língua Servida")).asked;
    for (const name of ["Língua Sem Autorização", "Língua Recusada 403", "Língua Recusada 404"]) {
      await call(`open(${JSON.stringify(name)})`);
    }
    await call("settle()");
    for (const name of ["Língua Servida", "Língua Sem Autorização", "Língua Recusada 403", "Língua Recusada 404"]) {
      seen[name] = await read(name);
    }
    asked.afterOthers = seen["Língua Servida"].asked;
    storage = await page.evaluate<string>("window.probe.storage()");
    await call('close("Língua Servida")');
    await call('open("Língua Servida")');
    await call('loaded("Língua Servida")');
    asked.afterReopen = (await read("Língua Servida")).asked;
  }, 240_000);

  afterAll(async () => {
    browser?.close();
    await server?.close();
    if (scratch) rmSync(scratch, { recursive: true, force: true });
  });

  it("autorizada e servida: a foto aparece sob a frase, com o alt da caixa", () => {
    const served = seen["Língua Servida"];
    expect(served.img).toMatchObject({ src: PNG, alt: PT.forms_submission_image_alt });
    expect(served.img!.width).toBeGreaterThan(0);
    expect(served.imageAnswer).toContain(PT.forms_submission_image_attached);
  });

  it("não autorizada: nem foto, nem espaço, e o link nunca é pedido", () => {
    expect(seen["Língua Sem Autorização"]).toMatchObject({ img: null, slot: false, asked: 0 });
    expect(seen["Língua Sem Autorização"].imageAnswer).toBe(PT.forms_submission_image_attached);
  });

  it("recusada (403 e 404): o espaço fica vazio e a tela não diz motivo", () => {
    for (const name of ["Língua Recusada 403", "Língua Recusada 404"]) {
      expect(seen[name], name).toMatchObject({ img: null, slot: true, emptySlot: true });
      expect(seen[name].asked, name).toBeGreaterThan(0);
      expect(seen[name].imageAnswer, name).toBe(PT.forms_submission_image_attached);
    }
  });

  it("abrir os outros Pulsos não pede de novo o link da foto que já está na tela", () => {
    expect(asked.first).toBeGreaterThan(0);
    expect(asked.afterOthers).toBe(asked.first);
  });

  it("fechar e reabrir pede um link novo: nada da URL ficou guardado", () => {
    expect(asked.afterReopen).toBeGreaterThan(asked.afterOthers!);
    expect(storage).not.toContain("data:image");
  });
});
