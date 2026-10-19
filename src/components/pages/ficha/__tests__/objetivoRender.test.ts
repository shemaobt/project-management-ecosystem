import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { RecordField, RecordFieldError } from "../../../../types/projectRecord";

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
const { makeEmptyProject, missingRequired } = await import(
  "../../../../stores/recordStore"
);
const { recordAccess } = await import("../../../../utils/recordAccess");
const { makeProject } = await import("../../../../utils/__tests__/factory");
const { ObjetivoTab } = await import("../tabs/Objetivo");

const noop = () => {};

const render = (errors: RecordFieldError[]) => {
  const saved = makeProject({
    id: "farol",
    startDate: "2026-05-10",
    deadline: "2026-05-01",
  });
  const place = recordAccess(saved, false, true, true);
  const values = { ...makeEmptyProject(), ...saved };
  return renderToStaticMarkup(
    createElement(ObjetivoTab, {
      mode: "editar",
      draft: {
        values,
        typed: { startDate: "2026-05-10", deadline: "2026-05-01" },
        saved,
        isNew: false,
        hasChanges: true,
        missing: missingRequired(values, place),
        place,
        errors,
        errorsFor: (field: RecordField) =>
          errors.filter((error) => error.field === field),
        set: noop,
        update: noop,
        discard: noop,
      },
    }),
  );
};

const inputTag = (markup: string, id: string) =>
  markup.match(new RegExp(`<input[^>]*id="${id}"[^>]*>`))?.[0] ?? "";

const REFUSAL: RecordFieldError = {
  field: "deadline",
  index: null,
  message: "before the start date (2026-05-10)",
};

describe("a recusa do prazo é dita no campo (OBT-601)", () => {
  it("o prazo recusado carrega a frase do servidor e se diz inválido", () => {
    const markup = render([REFUSAL]);
    const deadline = inputTag(markup, "ficha-prazo");

    expect(markup).toMatch(
      /<span id="ficha-prazo-erro" role="alert"[^>]*>before the start date \(2026-05-10\)<\/span>/,
    );
    expect(deadline).toContain('aria-invalid="true"');
    expect(deadline).toContain('aria-describedby="ficha-prazo-erro"');
    expect(inputTag(markup, "ficha-inicio")).not.toContain('aria-invalid="true"');
  });

  it("sem recusa, o prazo não diz nada", () => {
    const markup = render([]);

    expect(markup).not.toContain('role="alert"');
    expect(inputTag(markup, "ficha-prazo")).toContain('aria-invalid="false"');
  });
});
