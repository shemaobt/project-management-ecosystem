import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

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

const { default: i18n } = await import("../../../i18n");
const { InfoTooltip } = await import("../InfoTooltip");
const { OneTimeLink } = await import("../OneTimeLink");
const { ConfirmDialog } = await import("../ConfirmDialog");

beforeEach(async () => {
  await i18n.changeLanguage("pt");
});

const NOTE = "Os papéis regionais só valem com região.";

function tooltip(defaultOpen: boolean): string {
  return renderToStaticMarkup(
    createElement(InfoTooltip, {
      label: "Sobre papéis regionais",
      defaultOpen,
      children: NOTE,
    }),
  );
}

describe("InfoTooltip — um toggletip, não um tooltip de passar o mouse", () => {
  it("fechado, o botão diz que está fechado, aponta para a nota e a nota fica escondida", () => {
    const out = tooltip(false);
    expect(out).toContain('aria-expanded="false"');
    const controls = /aria-controls="([^"]+)"/u.exec(out)?.[1];
    expect(controls).toBeTruthy();
    expect(out).toContain(`id="${controls}" hidden=""`);
    expect(out).toContain('aria-label="Sobre papéis regionais"');
  });

  it("aberto, a mesma nota aparece — o texto é o mesmo nos dois estados", () => {
    const out = tooltip(true);
    expect(out).toContain('aria-expanded="true"');
    expect(out).not.toContain('hidden=""');
    expect(out).toContain(NOTE);
  });

  it("é um botão de verdade, que o teclado e o toque alcançam", () => {
    expect(tooltip(false)).toMatch(/<button type="button"/u);
  });
});

describe("OneTimeLink — o bloco do link que aparece uma vez", () => {
  it("mostra o link, o título, a nota e o botão de copiar com as chaves que ele possui", () => {
    const out = renderToStaticMarkup(
      createElement(OneTimeLink, {
        url: "https://pme.exemplo.org/convite?token=abc",
        heading: "Link pronto",
        note: "Copie agora.",
      }),
    );
    expect(out).toContain("https://pme.exemplo.org/convite?token=abc");
    expect(out).toContain("Link pronto");
    expect(out).toContain("Copie agora.");
    expect(out).toContain(i18n.t("link_copy"));
  });

  const LONG_URL =
    "https://project-management-ecosystem.exemplo.org/convite?token=Zm9vYmFyYmF6cXV4LXVtLXRva2VuLWxvbmdvLWRlLXZlcmRhZGU";
  const CUTS_THE_LINE =
    /^(?:truncate|text-ellipsis|text-clip|whitespace-nowrap|text-nowrap|overflow-(?:hidden|clip|x-hidden|x-clip)|line-clamp-\d+)$/u;

  function linkMarkup() {
    const out = renderToStaticMarkup(
      createElement(OneTimeLink, { url: LONG_URL, heading: "Link pronto", note: "Copie agora." }),
    );
    const match = /<div class="([^"]*)"><code class="([^"]*)">([^<]*)<\/code>/u.exec(out);
    expect(match).not.toBeNull();
    const [, row, code, text] = match!;
    return { row: row.split(/\s+/u), code: code.split(/\s+/u), text };
  }

  it("o endereço aparece inteiro: quebra dentro do próprio bloco em vez de sair cortado com reticências", () => {
    const { code, text } = linkMarkup();
    expect(text).toBe(LONG_URL);
    expect(code).toContain("wrap-anywhere");
    expect(code.filter((name) => CUTS_THE_LINE.test(name))).toEqual([]);
  });

  it("numa tela estreita o endereço pede a linha toda antes de dividi-la com o Copiar", () => {
    const { row, code } = linkMarkup();
    expect(row).toContain("flex-wrap");
    expect(code).toContain("flex-1");
    expect(code.some((name) => /^basis-/u.test(name))).toBe(true);
  });
});

describe("ConfirmDialog", () => {
  it("fechado, não desenha nada", () => {
    const out = renderToStaticMarkup(
      createElement(ConfirmDialog, {
        open: false,
        onOpenChange: () => undefined,
        title: "Revogar?",
        confirmLabel: "Revogar",
        onConfirm: () => undefined,
      }),
    );
    expect(out).toBe("");
  });
});
