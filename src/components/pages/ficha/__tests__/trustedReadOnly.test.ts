import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { RecordAccess } from "../../../../utils/recordAccess";

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

const { default: i18n } = await import("../../../../i18n");
const { RecordFooter } = await import("../RecordFooter");
const { FULL_ACCESS } = await import("../../../../utils/recordAccess");

const noop = () => undefined;

const escapeRe = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");

const saveButton = (html: string) =>
  html.match(new RegExp(`<button[^>]*>${escapeRe(i18n.t("btn_save"))}</button>`, "u"))?.[0] ?? "";

const footer = (place: RecordAccess) =>
  renderToStaticMarkup(
    createElement(RecordFooter, {
      mode: "ver",
      draft: { place, missing: [], hasChanges: false } as never,
      saving: false,
      onEdit: noop,
      onSave: noop,
      onDiscard: noop,
      onClose: noop,
    }),
  );

describe("o rodapé da ficha para quem só lê (OBT-571)", () => {
  it("um leitor read-only — o Círculo de Recursos — não vê o Editar, e vê o Fechar", () => {
    const html = footer({ ...FULL_ACCESS, readOnly: true });
    expect(html).not.toContain(i18n.t("modal_edit"));
    expect(html).toContain(i18n.t("btn_close"));
  });

  it("quem escreve segue vendo o Editar", () => {
    const html = footer(FULL_ACCESS);
    expect(html).toContain(i18n.t("modal_edit"));
  });
});

describe("a ficha nova com o local fora de onde a conta escreve (OBT-593)", () => {
  const editing = (outsideWrites: unknown) =>
    renderToStaticMarkup(
      createElement(RecordFooter, {
        mode: "editar",
        draft: { place: FULL_ACCESS, missing: [], hasChanges: true, outsideWrites } as never,
        saving: false,
        onEdit: noop,
        onSave: noop,
        onDiscard: noop,
        onClose: noop,
      }),
    );

  it("diz a região do local e onde a conta cadastra, e trava o salvar", () => {
    const html = editing({ region: "africa", writes: ["asia"] });
    expect(html).toContain(
      i18n.t("record_region_outside_writes", {
        region: i18n.t("continent_africa"),
        regions: i18n.t("continent_asia"),
      }),
    );
    const save = saveButton(html);
    expect(save).toContain('aria-disabled="true"');
    expect(save).toContain('aria-describedby="ficha-falta-preencher"');
    expect(html).toMatch(
      new RegExp(`id="ficha-falta-preencher"[^>]*>${escapeRe(i18n.t("record_region_outside_writes", {
        region: i18n.t("continent_africa"),
        regions: i18n.t("continent_asia"),
      }))}`, "u"),
    );
  });

  it("dentro do escopo, nada muda", () => {
    const html = editing(null);
    expect(html).not.toContain(i18n.t("continent_africa"));
    expect(saveButton(html)).not.toContain('aria-disabled="');
  });
});
