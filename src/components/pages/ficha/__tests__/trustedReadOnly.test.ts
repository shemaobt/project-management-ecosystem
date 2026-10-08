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
