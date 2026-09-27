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
