import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

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
const { makeEmptyProject } = await import("../../../../stores/recordStore");
const { makeNeed } = await import("../../../../utils/needs");
const { makeProject } = await import("../../../../utils/__tests__/factory");
const { recordAccess } = await import("../../../../utils/recordAccess");
const { NecessidadesTab } = await import("../tabs/Necessidades");
const { NotasTab } = await import("../tabs/Notas");
const { SaudeTab } = await import("../tabs/Saude");

const noop = () => {};

const NOTE = i18n.t("f_free_text_coordination_only", {
  regional: i18n.t("role_coordinator"),
  admin: i18n.t("role_admin"),
});

const place = (sensitive: boolean, readAs: "other" | "coordination") =>
  recordAccess(makeProject({ sensitiveCountry: sensitive, readAs }), false, true, true);

const handle = (access: ReturnType<typeof place>, values: Record<string, unknown> = {}) => ({
  values: { ...makeEmptyProject(), ...values },
  isNew: false,
  hasChanges: false,
  missing: [],
  set: noop,
  update: noop,
  typed: {},
  errors: [],
  errorsFor: () => [],
  place: access,
  discard: noop,
});

const notas = (mode: "ver" | "editar", access: ReturnType<typeof place>, notes = "") =>
  renderToStaticMarkup(createElement(NotasTab, { mode, draft: handle(access, { notes }) }));

const saude = (mode: "ver" | "editar", access: ReturnType<typeof place>, healthNotes = "") =>
  renderToStaticMarkup(createElement(SaudeTab, { mode, draft: handle(access, { healthNotes }) }));

const needs = (access: ReturnType<typeof place>, items: unknown[]) =>
  renderToStaticMarkup(
    createElement(NecessidadesTab, { mode: "editar", draft: handle(access, { needsItems: items }) }),
  );

const disabled = (markup: string, id: string): boolean => {
  const found = markup.match(new RegExp(`<textarea[^>]*id="${id}"[^>]*>`));
  expect(found, id).not.toBeNull();
  return /\sdisabled=""/.test(found![0]);
};

describe("as Notas de um registro recolhido (OBT-556)", () => {
  const withheld = place(true, "other");

  it("na edição, o campo é só leitura, vazio, e a nota diz por quê", () => {
    const markup = notas("editar", withheld, "texto que não deveria aparecer");
    expect(disabled(markup, "ficha-notas")).toBe(true);
    expect(markup).not.toContain("texto que não deveria aparecer");
    expect(markup).toContain(NOTE.slice(0, 40));
  });

  it("na leitura, o branco não é dito como 'sem notas': é dito como recolhido", () => {
    const markup = notas("ver", withheld);
    expect(markup).toContain(NOTE.slice(0, 40));
    expect(markup).not.toContain(i18n.t("notes_empty"));
  });

  it("a coordenação edita e lê as notas do mesmo registro", () => {
    const coordination = place(true, "coordination");
    const markup = notas("editar", coordination, "nota da coordenação");
    expect(disabled(markup, "ficha-notas")).toBe(false);
    expect(markup).toContain("nota da coordenação");
    expect(markup).not.toContain(NOTE.slice(0, 40));
  });

  it("um registro aberto, lido como other, edita as notas", () => {
    const markup = notas("editar", place(false, "other"), "nota");
    expect(disabled(markup, "ficha-notas")).toBe(false);
  });
});

describe("a descrição de uma necessidade num registro recolhido (OBT-556)", () => {
  const saved = { ...makeNeed(), id: "n1" };
  const fresh = makeNeed();

  it("a de uma necessidade salva é só leitura, e a nota aparece uma vez", () => {
    const markup = needs(place(true, "other"), [saved]);
    expect(disabled(markup, "need-0-desc")).toBe(true);
    expect(markup.split(NOTE.slice(0, 40))).toHaveLength(2);
  });

  it("a de uma necessidade nova é de quem a cria", () => {
    const markup = needs(place(true, "other"), [saved, fresh]);
    expect(disabled(markup, "need-0-desc")).toBe(true);
    expect(disabled(markup, "need-1-desc")).toBe(false);
  });

  it("sem necessidade salva, não há nota para explicar nada", () => {
    const markup = needs(place(true, "other"), [fresh]);
    expect(markup).not.toContain(NOTE.slice(0, 40));
  });

  it("a coordenação edita a descrição de uma necessidade salva", () => {
    const markup = needs(place(true, "coordination"), [saved]);
    expect(disabled(markup, "need-0-desc")).toBe(false);
  });
});

describe("as notas sobre a saúde de um registro recolhido (OBT-556)", () => {
  const withheld = place(true, "other");

  it("na edição, quem lê saúde mas não é coordenação não digita num campo que o servidor recusa", () => {
    const markup = saude("editar", withheld, "texto que não deveria aparecer");
    expect(disabled(markup, "saude-notes")).toBe(true);
    expect(markup).not.toContain("texto que não deveria aparecer");
    expect(markup).toContain(NOTE.slice(0, 40));
  });

  it("na leitura, o branco é dito como recolhido, não some", () => {
    expect(saude("ver", withheld)).toContain(NOTE.slice(0, 40));
  });

  it("a coordenação edita e lê as notas sobre a saúde", () => {
    const coordination = place(true, "coordination");
    const edit = saude("editar", coordination, "nota de saúde");
    expect(disabled(edit, "saude-notes")).toBe(false);
    expect(edit).not.toContain(NOTE.slice(0, 40));
    expect(saude("ver", coordination, "nota de saúde")).toContain("nota de saúde");
  });

  it("um registro aberto sem notas sobre a saúde não mostra a nota de recolhido", () => {
    expect(saude("ver", place(false, "other"))).not.toContain(NOTE.slice(0, 40));
  });

  it("a frase de recolhido nomeia as notas sobre a saúde, nas duas línguas", () => {
    for (const lng of ["pt-BR", "en"]) {
      const health = i18n.t("f_health_notes", { lng }).toLowerCase();
      expect(i18n.t("f_free_text_coordination_only", { lng }).toLowerCase()).toContain(health);
      expect(i18n.t("f_sensitive_on_pending", { lng }).toLowerCase()).toContain(health);
    }
  });
});
