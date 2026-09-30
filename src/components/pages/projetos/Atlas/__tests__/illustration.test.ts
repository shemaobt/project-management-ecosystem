import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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

const { default: i18n } = await import("../../../../../i18n");
const { makeProject } = await import("../../../../../utils/__tests__/factory");
const { AtlasView } = await import("..");
const { InicioView } = await import("../../../inicio");
const { GLOBE_FOCUS_POINTS } = await import("../../../../../constants/geo");

const projects = [
  makeProject({ id: "a", coords: [10, 10] }),
  makeProject({ id: "b", coords: [-40, -5] }),
  makeProject({ id: "c", coords: [100, 20] }),
];

const atlas = () =>
  renderToStaticMarkup(
    createElement(AtlasView, {
      projects,
      locationsWithheld: null,
      onSelect: () => undefined,
    }),
  );

const inicio = () =>
  renderToStaticMarkup(
    createElement(
      MemoryRouter,
      null,
      createElement(InicioView, { projects, onOpen: () => undefined }),
    ),
  );

const globeSvg = (markup: string) => {
  const start = markup.indexOf("<svg");
  const end = markup.indexOf("</svg>", start) + "</svg>".length;
  return { start, end, svg: markup.slice(start, end) };
};

const FOCUSABLE = /<(button|a|input|select|textarea)\b|tabindex=|contenteditable/i;

beforeEach(async () => {
  await i18n.changeLanguage("pt");
});

afterEach(() => storage.clear());

describe("o globo do Atlas é uma ilustração para o leitor de tela", () => {
  it("o SVG do globo sai da árvore de acessibilidade", () => {
    const { svg } = globeSvg(atlas());
    expect(svg.startsWith('<svg aria-hidden="true"')).toBe(true);
  });

  it("nada focável mora dentro do SVG escondido", () => {
    const { svg } = globeSvg(atlas());
    expect(svg).toContain("g-marker");
    expect(svg).not.toMatch(FOCUSABLE);
  });

  it("a frase só para leitor de tela diz que é ilustração e conta a lista", () => {
    const markup = atlas();
    const sentence = i18n.t("atlas_illustration_list", {
      count: projects.length,
    });
    expect(sentence).toContain("3");
    expect(markup).toContain(`<p class="sr-only">${sentence}</p>`);
  });

  it("com mais projetos que a página, a frase diz que a lista vem por partes", async () => {
    const many = Array.from({ length: 31 }, (_, index) =>
      makeProject({ id: `p${index}`, coords: [index, 10] }),
    );
    const view = () =>
      renderToStaticMarkup(
        createElement(AtlasView, {
          projects: many,
          locationsWithheld: null,
          onSelect: () => undefined,
        }),
      );
    const pt = view();
    expect(pt).toContain("os mesmos 31 projetos, 30 por vez");
    expect(pt).toContain("“Mostrar mais” carrega o resto");
    expect(pt).not.toContain("traz os mesmos 31 projetos.");
    await i18n.changeLanguage("en");
    expect(view()).toContain("the same 31 projects, 30 at a time");
    expect(view()).toContain("“Show more” loads the rest");
  });

  it("a frase acompanha a língua", async () => {
    await i18n.changeLanguage("en");
    const markup = atlas();
    expect(markup).toContain(
      `<p class="sr-only">${i18n.t("atlas_illustration_list", { count: 3 })}</p>`,
    );
    expect(markup).toContain("Illustrative map");
    expect(markup).not.toContain("Mapa ilustrativo");
  });

  it("com um só projeto a frase vai ao singular, nas duas línguas", async () => {
    const one = () =>
      renderToStaticMarkup(
        createElement(AtlasView, {
          projects: projects.slice(0, 1),
          locationsWithheld: null,
          onSelect: () => undefined,
        }),
      );
    expect(one()).toContain("traz o mesmo projeto.");
    await i18n.changeLanguage("en");
    expect(one()).toContain("has the same project.");
  });

  it("no Início não há lista abaixo, e a frase não promete uma", () => {
    const markup = inicio();
    expect(markup).toContain(
      `<p class="sr-only">${i18n.t("atlas_illustration", { count: 3 })}</p>`,
    );
    expect(markup).not.toContain(i18n.t("atlas_illustration_list", { count: 3 }));
    expect(markup).not.toContain("os mesmos 3 projetos");
    expect(markup).toContain("A lista e os filtros ficam na área Projetos");
  });

  it("o pausar e os três atalhos ficam fora do SVG, com nome", () => {
    const markup = atlas();
    const { start, end } = globeSvg(markup);
    const outside = markup.slice(0, start) + markup.slice(end);

    const pause = i18n.t("atlas_autorotate");
    expect(outside).toContain(`aria-label="${pause}"`);
    expect(outside).toContain('aria-pressed="true"');
    for (const point of GLOBE_FOCUS_POINTS) {
      const name = i18n.t(point.nameKey);
      expect(name).not.toBe(point.nameKey);
      expect(name.startsWith(point.label)).toBe(true);
      expect(outside).toContain(`aria-label="${name}"`);
    }

    const position = (needle: string) => markup.indexOf(needle);
    expect(position(`aria-label="${pause}"`)).toBeLessThan(start);
    for (const point of GLOBE_FOCUS_POINTS) {
      expect(position(`aria-label="${i18n.t(point.nameKey)}"`)).toBeLessThan(
        start,
      );
    }
  });

  it("a dica de arrastar, só para mouse, também sai da árvore", () => {
    const markup = atlas();
    const hint = markup.indexOf(i18n.t("atlas_hint"));
    const open = markup.lastIndexOf("<div", hint);
    expect(markup.slice(open, hint)).toContain("aria-hidden");
  });

  it("os quatro controles são exatamente os botões fora do SVG e do cartão", () => {
    const markup = atlas();
    const { start } = globeSvg(markup);
    const controls = markup.slice(0, start).match(/<button\b/g) ?? [];
    expect(controls).toHaveLength(1 + GLOBE_FOCUS_POINTS.length);
  });
});
