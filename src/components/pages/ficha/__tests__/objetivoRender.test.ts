import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { ProjectPhase } from "../../../../types/project";
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

const { default: i18n } = await import("../../../../i18n");
const { makeEmptyProject, missingRequired } = await import(
  "../../../../stores/recordStore"
);
const { recordAccess } = await import("../../../../utils/recordAccess");
const { makeProject } = await import("../../../../utils/__tests__/factory");
const { ObjetivoTab } = await import("../tabs/Objetivo");

const noop = () => {};

const render = (errors: RecordFieldError[], phases: ProjectPhase[] = []) => {
  const saved = makeProject({
    id: "farol",
    startDate: "2026-05-10",
    deadline: "2026-05-01",
    phases,
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

const textOf = (html: string) => html.replace(/<[^>]*>/g, "").trim();

/** Each control's accessible name: its `aria-label`, or the text of the `<label for>` naming it. */
function controlNames(markup: string): string[] {
  const labelled = [...markup.matchAll(/<label[^>]*for="([^"]+)"[^>]*>(.*?)<\/label>/g)];
  const byId = new Map(labelled.map(([, id, html]) => [id, textOf(html)]));
  return [...markup.matchAll(/<(input|textarea|select|button)\b[^>]*>/g)].flatMap(([tag]) => {
    const aria = /aria-label="([^"]*)"/.exec(tag)?.[1];
    const id = /\bid="([^"]*)"/.exec(tag)?.[1];
    const name = aria ?? (id === undefined ? undefined : byId.get(id));
    return name === undefined ? [] : [name];
  });
}

describe("cada controle das etapas tem nome próprio (OBT-665, PME-FIC-043)", () => {
  const phases: ProjectPhase[] = [
    { label: "", scope: "Evangelho de João", date: "2026-12-15" },
    { label: "", scope: "Atos", date: "2º semestre" },
  ];

  it("o prazo de uma etapa não se chama como o prazo do projeto, e duas etapas não se confundem", () => {
    const names = controlNames(render([], phases));
    const deadline = i18n.t("f_deadline");

    expect(names.filter((name) => name === deadline)).toHaveLength(1);
    for (const n of [1, 2]) {
      expect(names).toContain(i18n.t("f_phase_deadline_n", { n }));
      expect(names).toContain(i18n.t("f_phase_scope_n", { n }));
      expect(names).toContain(i18n.t("f_phase_name_n", { n }));
      expect(names).toContain(i18n.t("f_phase_remove", { n }));
    }
    expect(new Set(names).size).toBe(names.length);
  });
});
