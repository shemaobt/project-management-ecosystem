import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The Prayer Pulse as HTML (OBT-695, after OBT-690). The preview draws the server's document
 * apart from the page — a sandboxed `iframe` fed by `srcDoc` — so markup in it, a `<script>`
 * included, never becomes a node of the console; and the file is saved as the HTML it is.
 */
const downloads: { fileName: string; content: string; mimeType: string }[] = [];
vi.mock("../../../../utils/export", () => ({
  downloadTextFile: (fileName: string, content: string, mimeType: string) => {
    downloads.push({ fileName, content, mimeType });
  },
}));

const { PulsePreview } = await import("../PulseButton");
const { savePulse } = await import("../pulseFile");
const source = (await import("../PulseButton?raw")).default;

const HOSTILE = {
  fileName: "pulso-de-oracao-2026-11-10.html",
  text: [
    "<!doctype html>",
    "<html><body>",
    "<h1>Pulso de Oração</h1>",
    "<script>window.parent.document.title = 'tomado'</script>",
    '<img src="x" onerror="alert(1)">',
    "</body></html>",
  ].join("\n"),
};

beforeEach(() => {
  downloads.length = 0;
});

describe("a prévia do Pulso", () => {
  const markup = renderToStaticMarkup(
    createElement(PulsePreview, { file: HOSTILE, title: "Texto do Pulso de Oração" }),
  );

  it("é um iframe com sandbox vazio: sem allow-scripts nem allow-same-origin", () => {
    expect(markup).toMatch(/^<iframe /u);
    expect(markup).toContain('sandbox=""');
    expect(markup).not.toContain("allow-");
    expect(markup).toContain('title="Texto do Pulso de Oração"');
  });

  it("é clara nos dois temas: o fundo branco e a .tema-claro que devolve a linha", () => {
    const classes = /class="([^"]*)"/u.exec(markup)?.[1].split(" ") ?? [];
    expect(classes).toEqual(expect.arrayContaining(["tema-claro", "bg-branco", "border-line"]));
  });

  it("o documento entra como dado do srcdoc, e um <script> nele não vira nó da página", () => {
    expect(markup).toMatch(/ srcdoc="/iu);
    expect(markup).not.toMatch(/<script/iu);
    expect(markup).not.toMatch(/<img/iu);
    expect(markup).toContain("&lt;script&gt;");
  });

  it("o componente nunca injeta HTML na página", () => {
    expect(source).not.toMatch(/dangerouslySetInnerHTML\s*=/u);
    expect(source.match(/sandbox=[^\s>]*/gu)).toEqual(['sandbox=""']);
  });
});

describe("salvar o Pulso", () => {
  it("salva o documento com o nome do servidor e o tipo text/html", () => {
    savePulse(HOSTILE);

    expect(downloads).toEqual([
      {
        fileName: "pulso-de-oracao-2026-11-10.html",
        content: HOSTILE.text,
        mimeType: "text/html;charset=utf-8",
      },
    ]);
  });
});
