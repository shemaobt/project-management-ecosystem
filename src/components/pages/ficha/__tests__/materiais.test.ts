import { createElement, type ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

function createMemoryStorage() {
  const data = new Map<string, string>();
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => {
      data.set(key, value);
    },
    removeItem: (key: string) => {
      data.delete(key);
    },
    clear: () => data.clear(),
  };
}

const storage = createMemoryStorage();
vi.stubGlobal("localStorage", storage);
vi.stubGlobal("window", { localStorage: storage });

await import("../../../../i18n");
const { makeEmptyProject } = await import("../../../../stores/recordStore");
const { MateriaisTab } = await import("../tabs/Materiais");
const { makeEmptyMaterial } = await import("../../../../utils/media");

type Values = Partial<ReturnType<typeof makeEmptyProject>>;

const noop = () => {};

const handle = (values: Values = {}) => ({
  values: { ...makeEmptyProject(), ...values },
  isNew: false,
  hasChanges: false,
  missing: [],
  set: noop,
  update: noop,
  discard: noop,
});

const render = (element: ReactElement) => renderToStaticMarkup(element);

const view = (values: Values = {}) =>
  render(createElement(MateriaisTab, { mode: "ver", draft: handle(values) }));

const form = (values: Values = {}) =>
  render(
    createElement(MateriaisTab, { mode: "editar", draft: handle(values) }),
  );

const AUDIO = {
  ...makeEmptyMaterial(),
  kind: "audio" as const,
  scope: "Evangelho de João, cap. 1–3",
  fileName: "joao-1-3.mp3",
  fileSize: 2048,
  dataUrl: "data:audio/mpeg;base64,abc",
  format: "MP3",
  durationSeconds: 3725,
};

const TEXT_WITH_LINK = {
  ...makeEmptyMaterial(),
  scope: "Rute",
  link: "https://drive.example/rute",
};

describe("MateriaisView", () => {
  it("guides the empty state — all 127 fixtures arrive with no materials", () => {
    const html = view();
    expect(html).toContain("Nenhum material traduzido registrado ainda");
  });

  it("shows each material with its type and scope", () => {
    const html = view({ materials: [AUDIO, TEXT_WITH_LINK] });
    expect(html).toContain("Áudio traduzido");
    expect(html).toContain("Texto traduzido");
    expect(html).toContain("Evangelho de João, cap. 1–3");
    expect(html).toContain("Rute");
  });

  it("an audio carries its format and duration beside the file name", () => {
    const html = view({ materials: [AUDIO] });
    expect(html).toContain("joao-1-3.mp3 · MP3 · 1:02:05");
    expect(html).toContain("Abrir / Baixar");
  });

  it("a format-only audio never renders a dangling separator", () => {
    const html = view({
      materials: [{ ...AUDIO, durationSeconds: undefined }],
    });
    expect(html).toContain("joao-1-3.mp3 · MP3");
    expect(html).not.toContain("MP3 ·");
  });

  it("an external link is announced and opens in a new tab", () => {
    const html = view({ materials: [TEXT_WITH_LINK] });
    expect(html).toContain("Link externo");
    expect(html).toContain("Abrir link");
    expect(html).toContain('rel="noopener noreferrer"');
  });

  it("a registered material without artifact says so", () => {
    const html = view({
      materials: [{ ...makeEmptyMaterial(), scope: "Jonas" }],
    });
    expect(html).toContain("Nenhum arquivo importado");
  });
});

describe("MateriaisForm", () => {
  it("offers type, scope, file import and link for each row", () => {
    const html = form({ materials: [TEXT_WITH_LINK] });
    expect(html).toContain("Tipo do material");
    expect(html).toContain("Escopo (ex: Evangelho de João, cap. 1–3)");
    expect(html).toContain("Importar arquivo");
    expect(html).toContain("ou link");
    expect(html).toContain("Remover · Texto traduzido 1");
    expect(html).toContain("Adicionar material");
  });

  it("a row with a file offers replace, download and the audio metadata", () => {
    const html = form({ materials: [AUDIO] });
    expect(html).toContain("Trocar arquivo");
    expect(html).toContain("Abrir / Baixar");
    expect(html).toContain("joao-1-3.mp3 · MP3 · 1:02:05");
  });

  it("the audio row accepts audio files only", () => {
    const html = form({ materials: [{ ...makeEmptyMaterial(), kind: "audio" as const }] });
    expect(html).toContain('accept="audio/*"');
  });

  it("explains the tab with the prototype hint", () => {
    expect(form()).toContain("Importe os áudios e textos já traduzidos");
  });
});
