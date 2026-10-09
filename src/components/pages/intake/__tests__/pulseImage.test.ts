import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it } from "vitest";
import {
  INTAKE_IMAGE_ACCEPT,
  INTAKE_IMAGE_MAX_BYTES,
  isIntakeImageFile,
} from "../../../../services/mediaStorage";
import type { IntakeField, IntakeForm } from "../../../../types/forms";
import type { IntakeImageUpload } from "../../../../utils/intake";
import { IntakeFormView } from "../IntakeFormView";

const { default: i18n } = await import("../../../../i18n");

beforeEach(async () => {
  await i18n.changeLanguage("pt");
});

/** The three questions OBT-578 added, as the server sends them. */
const IMAGE_FIELDS: readonly IntakeField[] = [
  { key: "image", type: "image", required: false, labelKey: "forms_q_image", maxLength: null, options: [] },
  {
    key: "imageDescription",
    type: "longText",
    required: false,
    labelKey: "forms_q_image_description",
    maxLength: 1000,
    options: [],
  },
  {
    key: "imageAuthorized",
    type: "checkbox",
    required: false,
    labelKey: "forms_q_image_authorization",
    maxLength: null,
    options: [],
  },
];

const FORM: IntakeForm = {
  kind: "pulso",
  definitionVersion: 2,
  languageName: "Guarani Mbyá",
  expiresAt: "2026-10-30",
  fields: IMAGE_FIELDS,
};

const noop = () => undefined;
const never: IntakeImageUpload = () => Promise.reject(new Error("não devia subir ao renderizar"));

const render = (over: Partial<Parameters<typeof IntakeFormView>[0]> = {}) =>
  renderToStaticMarkup(
    createElement(IntakeFormView, {
      form: FORM,
      answers: {},
      onAnswerChange: noop,
      fieldErrors: {},
      generalError: null,
      reloadNeeded: false,
      submitting: false,
      draftRestored: false,
      onSubmit: noop,
      uploadImage: never,
      ...over,
    }),
  );

describe("o Pulso tem os três campos da imagem (OBT-580)", () => {
  it("pergunta a imagem, a descrição e a autorização, em PT", () => {
    const markup = render();
    expect(markup).toContain(i18n.t("forms_q_image"));
    expect(markup).toContain(i18n.t("forms_q_image_description"));
    expect(markup).toContain(i18n.t("forms_q_image_authorization"));
    expect(markup).toContain(i18n.t("intake_authorization_hint"));
    expect(markup).toContain('type="checkbox"');
  });

  it("e em EN, sem português", async () => {
    await i18n.changeLanguage("en");
    const markup = render();
    expect(markup).toContain(i18n.t("forms_q_image"));
    expect(markup).not.toContain("Uma imagem do trabalho");
    expect(markup).not.toContain("Autorizo o uso");
    await i18n.changeLanguage("pt");
  });

  it("o seletor de arquivo aceita só JPEG, PNG e WebP, e diz o limite", () => {
    const markup = render();
    expect(markup).toContain(`accept="${INTAKE_IMAGE_ACCEPT}"`);
    expect(INTAKE_IMAGE_ACCEPT).toBe("image/jpeg,image/png,image/webp");
    expect(INTAKE_IMAGE_MAX_BYTES).toBe(10 * 1024 * 1024);
    expect(markup).toContain(i18n.t("intake_image_hint"));
    expect(markup).toContain(i18n.t("intake_image_choose"));
  });

  it("sem como subir a imagem, o campo não é desenhado — um seletor que só falha é botão morto", () => {
    const markup = render({ uploadImage: undefined });
    expect(markup).not.toContain('type="file"');
    expect(markup).toContain(i18n.t("forms_q_image"));
  });

  it("com a imagem já enviada, a resposta é o id e a tela oferece trocar ou remover", () => {
    const markup = render({ answers: { image: "intake-image-1" } });
    expect(markup).toContain(i18n.t("intake_image_replace"));
    expect(markup).toContain(i18n.t("intake_image_remove"));
    expect(markup).not.toContain(i18n.t("intake_image_choose"));
  });

  it("a caixa marcada é true; vazia, o servidor lê como não autorizado", () => {
    expect(render({ answers: { imageAuthorized: true } })).toContain('checked=""');
    expect(render({ answers: {} })).not.toContain('checked=""');
  });
});

describe("o que o console deixa subir", () => {
  it("JPEG, PNG e WebP sim; AVIF e SVG não, porque o servidor não os prova", () => {
    expect(isIntakeImageFile({ type: "image/jpeg" })).toBe(true);
    expect(isIntakeImageFile({ type: "image/png" })).toBe(true);
    expect(isIntakeImageFile({ type: "image/webp" })).toBe(true);
    expect(isIntakeImageFile({ type: "image/avif" })).toBe(false);
    expect(isIntakeImageFile({ type: "image/svg+xml" })).toBe(false);
  });
});
