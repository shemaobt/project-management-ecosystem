import { createElement, type ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

/*
 * OBT-573 — Karina, 6/out, question 8: on a sensitive project the objective's, the finances'
 * and the needs' notes, the partner organisation, the status goal, the photo and video
 * captions and the recording place stay with coordination. The server hands them to the OBT Lab
 * as "" and refuses them on write; the ficha shows the coordination-only phrase in their place
 * and does not offer the field. The Resource Circle reads them (OBT-571) and edits nothing.
 */

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
const { AuthProvider } = await import("../../../../contexts/AuthContext");
const { makeEmptyProject } = await import("../../../../stores/recordStore");
const { makeProject } = await import("../../../../utils/__tests__/factory");
const { mayWriteStoryPlace, recordAccess } = await import("../../../../utils/recordAccess");
const { ObjetivoTab } = await import("../tabs/Objetivo");
const { RecursosTab } = await import("../tabs/Recursos");
const { EquipeTab } = await import("../tabs/Equipe");
const { ProgressoTab } = await import("../tabs/Progresso");
const { MidiaTab } = await import("../tabs/Midia");

const noop = () => {};

const NOTE = i18n.t("f_free_text_coordination_only", {
  regional: i18n.t("role_coordinator"),
  admin: i18n.t("role_admin"),
}).slice(0, 40);

type Reader = "other" | "coordination" | "trusted";

const place = (reader: Reader, sensitive = true) =>
  recordAccess(makeProject({ sensitiveCountry: sensitive, readAs: reader }), false, true, true);

const handle = (reader: Reader, values: Record<string, unknown>, sensitive = true) => {
  const saved = makeProject({ sensitiveCountry: sensitive, readAs: reader, ...values });
  return {
    values: { ...makeEmptyProject(), ...values },
    saved,
    isNew: false,
    hasChanges: false,
    missing: [],
    set: noop,
    update: noop,
    typed: {},
    errors: [],
    errorsFor: () => [],
    place: place(reader, sensitive),
    discard: noop,
  };
};

const render = (element: ReactElement) =>
  renderToStaticMarkup(
    createElement(MemoryRouter, null, createElement(AuthProvider, null, element)),
  );

const tab = (
  Tab: typeof ObjetivoTab,
  mode: "ver" | "editar",
  reader: Reader,
  values: Record<string, unknown> = {},
  sensitive = true,
) => render(createElement(Tab, { mode, draft: handle(reader, values, sensitive) }));

/** Whether the first textarea or input carrying `attribute` (verbatim) is `disabled`. */
const disabledField = (markup: string, attribute: string): boolean => {
  const literal = attribute.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const found = markup.match(new RegExp(`<(textarea|input)[^>]*${literal}[^>]*>`));
  expect(found, attribute).not.toBeNull();
  return /\sdisabled=""/.test(found![0]);
};

describe("as observações do objetivo e do financeiro", () => {
  it("o OBT Lab vê a frase de recolhido no lugar delas", () => {
    expect(tab(ObjetivoTab, "ver", "other")).toContain(NOTE);
    expect(tab(RecursosTab, "ver", "other")).toContain(NOTE);
  });

  it("e não as edita", () => {
    expect(disabledField(tab(ObjetivoTab, "editar", "other"), 'id="ficha-objetivo-notas"')).toBe(true);
    expect(disabledField(tab(RecursosTab, "editar", "other"), 'id="ficha-recursos-notas"')).toBe(true);
  });

  it("a coordenação e o Resource Circle leem o texto", () => {
    for (const reader of ["coordination", "trusted"] as const) {
      expect(tab(ObjetivoTab, "ver", reader, { objectiveNotes: "o objetivo" })).toContain("o objetivo");
      expect(tab(RecursosTab, "ver", reader, { financialNotes: "o financeiro" })).toContain("o financeiro");
    }
  });

  it("a coordenação edita", () => {
    expect(disabledField(tab(ObjetivoTab, "editar", "coordination"), 'id="ficha-objetivo-notas"')).toBe(false);
  });

  it("num projeto aberto, nada é recolhido", () => {
    expect(tab(ObjetivoTab, "ver", "other", { objectiveNotes: "aberto" }, false)).toContain("aberto");
  });
});

describe("a organização parceira", () => {
  it("o OBT Lab não a edita num projeto sensível", () => {
    expect(disabledField(tab(EquipeTab, "editar", "other"), 'id="ficha-partner"')).toBe(true);
  });

  it("a coordenação lê e edita", () => {
    expect(tab(EquipeTab, "ver", "coordination", { partnerOrg: "Missao Parceira" })).toContain(
      "Missao Parceira",
    );
    expect(disabledField(tab(EquipeTab, "editar", "coordination"), 'id="ficha-partner"')).toBe(false);
  });
});

describe("o local da gravação de uma história salva", () => {
  const stories = {
    objective: ["Histórias"],
    storyProgress: [{ name: "Criacao", recordLocation: "", recordStatus: "planned" }],
  };

  it("fica bloqueado para o OBT Lab, com a frase", () => {
    const markup = tab(ProgressoTab, "editar", "other", stories);
    expect(markup).toContain(NOTE);
    expect(disabledField(markup, `aria-label="${i18n.t("story_location_ph")}"`)).toBe(true);
  });

  it("é da coordenação", () => {
    const markup = tab(ProgressoTab, "editar", "coordination", stories);
    expect(disabledField(markup, `aria-label="${i18n.t("story_location_ph")}"`)).toBe(false);
  });

  it("uma história nova é de quem a cria", () => {
    const access = place("other");
    expect(mayWriteStoryPlace(access, true)).toBe(false);
    expect(mayWriteStoryPlace(access, false)).toBe(true);
    expect(mayWriteStoryPlace(place("trusted"), false)).toBe(false);
  });
});

describe("as legendas de fotos e vídeos", () => {
  it("o OBT Lab vê a frase de recolhido", () => {
    expect(tab(MidiaTab, "ver", "other")).toContain(NOTE);
  });

  it("e não edita a legenda", () => {
    const markup = tab(MidiaTab, "editar", "other");
    expect(disabledField(markup, `aria-label="${i18n.t("f_media_caption")}`)).toBe(true);
  });

  it("a coordenação não vê a frase", () => {
    expect(tab(MidiaTab, "ver", "coordination")).not.toContain(NOTE);
  });
});

describe("as duas frases (texto nosso, não aprovado pela cliente)", () => {
  it("nomeiam os sete da pergunta 8 e o OBT Lab, nas duas línguas, sem o Estrategista Global", () => {
    const pieces = {
      "pt-BR": ["observações do objetivo", "organização parceira", "meta do status", "legendas", "local da gravação"],
      en: ["notes on the objective", "partner organisation", "status goal", "captions", "recording place"],
    } as const;
    for (const lng of ["pt-BR", "en"] as const) {
      const lab = i18n.t("role_obtlab", { lng });
      for (const key of ["f_free_text_coordination_only", "f_sensitive_on_pending"]) {
        const text = i18n.t(key, { lng, lab, circle: i18n.t("role_resource", { lng }) });
        for (const piece of pieces[lng]) expect(text.toLowerCase(), `${lng} ${key}`).toContain(piece);
        expect(text).toContain(lab);
        expect(text.toLowerCase()).not.toMatch(/estrategista|strategist/);
        expect(text).not.toMatch(/continuam à vista|stays in plain sight/);
      }
    }
  });
});
