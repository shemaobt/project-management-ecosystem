import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import type { ProjectDraft } from "../../../../stores/recordStore";
import type { RegionKey } from "../../../../types/region";
import type { RecordAccess } from "../../../../utils/recordAccess";
import type { DraftHandle } from "../useDraft";

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
const { FULL_ACCESS, recordAccess } = await import("../../../../utils/recordAccess");
const { makeEmptyProject, missingRequired } = await import("../../../../stores/recordStore");
const { outsideWritesOf } = await import("../useDraft");
const { IdentidadeTab } = await import("../tabs/Identidade");

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

describe("a ficha nova com o local em branco (OBT-654)", () => {
  const filled: ProjectDraft = {
    ...makeEmptyProject(),
    languageName: "Língua QA",
    bridgeLanguage: "Português",
    team: "YWAM QA",
    objective: ["NT"],
  };

  /** The handle as `useDraft` builds it for `/ficha/novo`, off the same functions. */
  const newRecord = (writes: readonly RegionKey[] | null, location: string): DraftHandle => {
    const place = recordAccess(undefined, true, true, true, writes);
    const values = { ...filled, location, readAs: "coordination" as const };
    return {
      values,
      typed: { location },
      isNew: true,
      hasChanges: true,
      missing: missingRequired(values, place),
      outsideWrites: outsideWritesOf(true, writes, location),
      place,
      errors: [],
      errorsFor: () => [],
      set: noop,
      update: noop,
      discard: noop,
    };
  };

  const footerOf = (draft: DraftHandle) =>
    renderToStaticMarkup(
      createElement(RecordFooter, {
        mode: "editar",
        draft,
        saving: false,
        onEdit: noop,
        onSave: noop,
        onDiscard: noop,
        onClose: noop,
      }),
    );

  const formOf = (draft: DraftHandle) =>
    renderToStaticMarkup(
      createElement(MemoryRouter, null, createElement(IdentidadeTab, { mode: "editar", draft })),
    );

  const locationInput = (html: string) =>
    html.match(/<input[^>]*id="ficha-location"[^>]*>/u)?.[0] ?? "";

  const outsideSentence = (region: string) =>
    i18n.t("record_region_outside_writes", {
      region: i18n.t(region),
      regions: i18n.t("continent_africa"),
    });

  it("local em branco de quem escreve só na África: o rodapé diz que falta a Localização, sem 'fica em', e o Salvar aponta para isso", () => {
    for (const blank of ["", " , "]) {
      const html = footerOf(newRecord(["africa"], blank));
      expect(html).toMatch(
        new RegExp(
          `id="ficha-falta-preencher"[^>]*>${escapeRe(
            i18n.t("record_missing_required", { fields: i18n.t("f_location") }),
          )}<`,
          "u",
        ),
      );
      expect(html).not.toContain(outsideSentence("continent_other"));
      expect(html).not.toContain(i18n.t("continent_other"));
      const save = saveButton(html);
      expect(save).toContain('aria-disabled="true"');
      expect(save).toContain('aria-describedby="ficha-falta-preencher"');
    }
  });

  it("o campo Localização da ficha nova se diz obrigatório, e não diz que fica em América Central", () => {
    const html = formOf(newRecord(["africa"], ""));
    expect(locationInput(html)).toContain('aria-required="true"');
    expect(locationInput(html)).not.toContain('aria-invalid="true"');
    expect(html).not.toContain(i18n.t("continent_other"));
  });

  it("com local preenchido fora, a frase da OBT-593 volta; dentro, nada trava", () => {
    const india = newRecord(["africa"], "India");
    expect(india.missing).toEqual([]);
    expect(footerOf(india)).toContain(outsideSentence("continent_asia"));
    expect(formOf(india)).toContain(outsideSentence("continent_asia"));
    expect(locationInput(formOf(india))).toContain('aria-invalid="true"');

    const inside = footerOf(newRecord(["africa"], "Mozambique, Tete"));
    expect(inside).not.toContain('id="ficha-falta-preencher"');
    expect(saveButton(inside)).not.toContain('aria-disabled="');
  });

  it("quem escreve em `other` ou em todas as regiões salva sem local", () => {
    for (const writes of [["other"] as const, null]) {
      const draft = newRecord(writes, "");
      const html = footerOf(draft);
      expect(html).not.toContain('id="ficha-falta-preencher"');
      expect(saveButton(html)).not.toContain('aria-disabled="');
      expect(locationInput(formOf(draft))).not.toContain("aria-required");
    }
  });
});
