import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it } from "vitest";
import type { IntakeField, IntakeForm } from "../../../../types/forms";
import { IntakeFormView } from "../IntakeFormView";
import {
  IntakeLinkProblemView,
  IntakeNetworkProblemView,
} from "../IntakeLinkProblem";
import { IntakeSuccessView } from "../IntakeSuccess";

const { default: i18n } = await import("../../../../i18n");

beforeEach(async () => {
  await i18n.changeLanguage("pt");
});

const FIELDS: readonly IntakeField[] = [
  {
    key: "submittedBy",
    type: "text",
    required: true,
    labelKey: "forms_q_submitted_by",
    maxLength: 200,
    options: [],
  },
  {
    key: "period",
    type: "period",
    required: true,
    labelKey: "forms_q_period",
    maxLength: null,
    options: [],
  },
  {
    key: "voice",
    type: "longText",
    required: false,
    labelKey: "forms_q_voice",
    maxLength: 4000,
    options: [],
  },
  {
    key: "prayerVisibility",
    type: "choice",
    required: false,
    labelKey: "forms_q_prayer_visibility",
    maxLength: null,
    options: ["coordenacao", "rede"],
  },
];

const FORM: IntakeForm = {
  kind: "pulso",
  definitionVersion: 1,
  languageName: "Guarani Mbyá",
  expiresAt: "2026-10-30",
  fields: FIELDS,
};

const noop = () => undefined;

const baseProps = {
  form: FORM,
  answers: {},
  onAnswerChange: noop,
  fieldErrors: {},
  generalError: null,
  reloadNeeded: false,
  submitting: false,
  draftRestored: false,
  onSubmit: noop,
};

describe("o formulário público nasce das definições do servidor", () => {
  it("cada pergunta do servidor aparece, na ordem que ele mandou", () => {
    const markup = renderToStaticMarkup(
      createElement(IntakeFormView, baseProps),
    );

    expect(markup).toContain(i18n.t("forms_q_submitted_by"));
    expect(markup).toContain(i18n.t("forms_q_period"));
    expect(markup).toContain(i18n.t("forms_q_voice"));
    expect(markup).toContain(i18n.t("forms_q_prayer_visibility"));
    expect(markup).toContain("Guarani Mbyá");
  });

  it("um campo que o servidor nunca mandou não aparece", () => {
    const markup = renderToStaticMarkup(
      createElement(IntakeFormView, baseProps),
    );

    expect(markup).not.toContain(i18n.t("forms_q_chapters"));
    expect(markup).not.toContain(i18n.t("forms_q_blockers"));
  });
});

describe("a recusa do servidor aparece no campo, não num parágrafo genérico", () => {
  it("o campo marcado mostra seu próprio aviso", () => {
    const markup = renderToStaticMarkup(
      createElement(IntakeFormView, {
        ...baseProps,
        fieldErrors: { submittedBy: "intake_err_required" },
      }),
    );

    expect(markup).toContain(i18n.t("intake_err_required"));
    expect(markup).toContain(i18n.t("intake_form_check_answers"));
  });

  it("uma versão de formulário desatualizada pede recarregar, não travar em silêncio", () => {
    const markup = renderToStaticMarkup(
      createElement(IntakeFormView, { ...baseProps, reloadNeeded: true }),
    );

    expect(markup).toContain(i18n.t("intake_form_reload_needed"));
    expect(markup).toContain(i18n.t("intake_form_reload"));
  });
});

describe("um rascunho retomado avisa, sem reescrever o que já foi digitado", () => {
  it("o aviso aparece e o valor digitado é o do rascunho, não vazio", () => {
    const markup = renderToStaticMarkup(
      createElement(IntakeFormView, {
        ...baseProps,
        answers: { submittedBy: "Kuaray" },
        draftRestored: true,
      }),
    );

    expect(markup).toContain(i18n.t("intake_form_draft_restored"));
    expect(markup).toContain("Kuaray");
  });
});

describe("enviar não trava sem dizer nada, e o rótulo muda durante o envio", () => {
  it("o botão diz enviando enquanto submitting é verdadeiro", () => {
    const markup = renderToStaticMarkup(
      createElement(IntakeFormView, { ...baseProps, submitting: true }),
    );

    expect(markup).toContain(i18n.t("intake_submitting"));
    expect(markup).not.toContain(i18n.t("intake_submit"));
  });
});

describe("um link morto explica a situação, não devolve um 403 seco", () => {
  it("expirado, revogado e inválido dizem coisas diferentes", () => {
    const expired = renderToStaticMarkup(
      createElement(IntakeLinkProblemView, { problem: "expired" }),
    );
    const revoked = renderToStaticMarkup(
      createElement(IntakeLinkProblemView, { problem: "revoked" }),
    );
    const invalid = renderToStaticMarkup(
      createElement(IntakeLinkProblemView, { problem: "invalid" }),
    );

    expect(expired).toContain(i18n.t("intake_link_expired_title"));
    expect(revoked).toContain(i18n.t("intake_link_revoked_title"));
    expect(invalid).toContain(i18n.t("intake_link_invalid_title"));
    expect(expired).not.toBe(revoked);
    expect(revoked).not.toBe(invalid);
  });

  it("um problema de rede, ao contrário de um link morto, oferece tentar de novo", () => {
    const markup = renderToStaticMarkup(
      createElement(IntakeNetworkProblemView, {
        message: "sem conexão",
        onRetry: noop,
      }),
    );

    expect(markup).toContain("sem conexão");
    expect(markup).toContain(i18n.t("intake_retry"));
  });
});

describe("o sucesso é uma confirmação clara, e não devolve nada do que foi digitado", () => {
  it("confirma sem ecoar respostas", () => {
    const markup = renderToStaticMarkup(createElement(IntakeSuccessView));

    expect(markup).toContain(i18n.t("intake_success_title"));
    expect(markup).toContain(i18n.t("intake_success_body"));
  });
});
