import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { IntakeForm } from "../../../../types/forms";

/**
 * O link de um projeto sensível não entrega o nome da língua (OBT-692 — Daniel, 9/nov/2026).
 * O servidor devolve a chave da região com `languageNameWithheld: true` quando o projeto não tem
 * nome público, e a página do líder diz o que a ficha diz: *Projeto sensível — {região}*. A chave
 * crua nunca chega à tela (OBT-562/600).
 */
const memory = new Map<string, string>();
const storage = {
  getItem: (key: string) => memory.get(key) ?? null,
  setItem: (key: string, value: string) => void memory.set(key, value),
  removeItem: (key: string) => void memory.delete(key),
  clear: () => memory.clear(),
};
vi.stubGlobal("localStorage", storage);
vi.stubGlobal("window", { localStorage: storage });

const { intakeFormOf } = await import("../../../../services/api/endpoints");
const { IntakeFormView } = await import("../IntakeFormView");
const { default: i18n } = await import("../../../../i18n");

beforeEach(async () => {
  await i18n.changeLanguage("pt");
});

const WIRE = {
  kind: "pulso",
  definitionVersion: 1,
  expiresAt: "2026-12-20",
  fields: [],
} as const;

const noop = () => undefined;

function greeting(form: IntakeForm): string {
  const markup = renderToStaticMarkup(
    createElement(IntakeFormView, {
      form,
      answers: {},
      onAnswerChange: noop,
      fieldErrors: {},
      generalError: null,
      reloadNeeded: false,
      submitting: false,
      draftRestored: false,
      onSubmit: noop,
    }),
  );
  return /<h1[^>]*>(.*?)<\/h1>/su.exec(markup)?.[1] ?? "";
}

describe("a saudação da página do líder segue a redação da ficha", () => {
  it("projeto comum: o nome da língua, como antes", () => {
    const form = intakeFormOf({
      ...WIRE,
      languageName: "Guarani Mbyá",
      languageNameWithheld: false,
    });
    expect(greeting(form)).toBe("Conta o mês, Guarani Mbyá.");
  });

  it("sensível sem nome público: Projeto sensível — a região, nunca a chave", () => {
    const form = intakeFormOf({ ...WIRE, languageName: "africa", languageNameWithheld: true });
    expect(greeting(form)).toBe("Conta o mês, Projeto sensível — África.");
    expect(greeting(form)).not.toMatch(/\bafrica\b/u);
  });

  it("sensível com nome público: o nome público", () => {
    const form = intakeFormOf({
      ...WIRE,
      languageName: "Língua do Vale",
      languageNameWithheld: true,
    });
    expect(greeting(form)).toBe("Conta o mês, Língua do Vale.");
  });

  it("em inglês, a região também vem traduzida", async () => {
    await i18n.changeLanguage("en");
    const form = intakeFormOf({
      ...WIRE,
      languageName: "south-america",
      languageNameWithheld: true,
    });
    expect(greeting(form)).toBe("Tell us about the month, Sensitive project — South America.");
  });
});

describe("sem a marca legível, a leitura fecha", () => {
  it("campo ausente: tratado como redigido, e a chave da região não aparece crua", () => {
    const form = intakeFormOf({ ...WIRE, languageName: "africa" });
    expect(form.languageNameWithheld).toBe(true);
    expect(greeting(form)).toBe("Conta o mês, Projeto sensível — África.");
  });

  it("campo ilegível: o mesmo", () => {
    const form = intakeFormOf({ ...WIRE, languageName: "africa", languageNameWithheld: "não" });
    expect(form.languageNameWithheld).toBe(true);
  });
});
