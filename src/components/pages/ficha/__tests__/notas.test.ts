import { createElement, type ReactElement } from "react";
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

await import("../../../../i18n");
const { makeEmptyProject } = await import("../../../../stores/recordStore");
const { NotasTab } = await import("../tabs/Notas");
const { escapeHtml } = await import("../../../../utils/format");

type Values = Partial<ReturnType<typeof makeEmptyProject>>;

const noop = () => {};

const handle = (values: Values = {}) => ({
  values: { ...makeEmptyProject(), ...values },
  isNew: false,
  hasChanges: false,
  missing: [],
  set: noop,
  update: noop,
  discard: noop,
});

const render = (element: ReactElement) => renderToStaticMarkup(element);

const view = (values: Values = {}) =>
  render(createElement(NotasTab, { mode: "ver", draft: handle(values) }));

const form = (values: Values = {}) =>
  render(createElement(NotasTab, { mode: "editar", draft: handle(values) }));

const ANY_SCRIPT_NOTE =
  "Fase 2 travada — aguardando revisor.\nምዕራፍ 3 ተጠናቀቀ · 第4章正在进行 · ܡܛܠ ܗܕܐ\n  espaços preservados & <tags> intactas";

describe("NotasView", () => {
  it("renders the note exactly as stored, in any script, breaks preserved", () => {
    const html = view({ notes: ANY_SCRIPT_NOTE });
    expect(html).toContain(escapeHtml(ANY_SCRIPT_NOTE));
    expect(html).toContain("whitespace-pre-wrap");
  });

  it("guides the empty state instead of showing a bare panel", () => {
    const html = view();
    expect(html).toContain("Nenhuma nota ainda");
    expect(html).not.toContain("whitespace-pre-wrap");
  });

  it("states the internal-by-default rule with and without content", () => {
    expect(view()).toContain("internas por padrão");
    expect(view({ notes: "algo" })).toContain("internas por padrão");
  });
});

describe("NotasForm", () => {
  it("edits the raw value with no transformation on the way in", () => {
    const html = form({ notes: ANY_SCRIPT_NOTE });
    expect(html).toContain(escapeHtml(ANY_SCRIPT_NOTE));
    expect(html).toContain("Notas livres");
  });

  it("states the internal-by-default rule where the note is written", () => {
    expect(form()).toContain("internas por padrão");
  });
});
