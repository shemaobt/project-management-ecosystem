import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it } from "vitest";

const { default: i18n } = await import("../../../../i18n");
const { EmptyResults } = await import("../EmptyResults");

const render = (narrowed: boolean, search = "") =>
  renderToStaticMarkup(createElement(EmptyResults, { narrowed, search, onClear: () => {} }));

beforeEach(async () => {
  await i18n.changeLanguage("pt");
});

describe("a lista vazia diz por quê, e só oferece limpar o que está filtrando (OBT-665, PME-PRJ-099)", () => {
  it("sem filtro nem busca, explica pelas regiões e não oferece Limpar tudo", () => {
    const markup = render(false);

    expect(markup).toContain(i18n.t("empty_scope_sub"));
    expect(markup).not.toContain(i18n.t("sb_clear_all"));
    expect(markup).not.toContain(i18n.t("empty_sub"));
    expect(markup).not.toContain("<button");
  });

  it("com um filtro, oferece Limpar tudo e a dica de ajustar", () => {
    const markup = render(true);

    expect(markup).toContain(i18n.t("sb_clear_all"));
    expect(markup).toContain(i18n.t("empty_sub"));
  });

  it("com uma busca, nomeia o termo procurado", () => {
    const markup = render(true, "  Lingala ");

    expect(markup).toContain(i18n.t("sb_clear_all"));
    expect(markup).toContain("Lingala");
  });
});
