import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it } from "vitest";
import type { IntakeField, ReceivedSubmissionDetail } from "../../../../types/forms";
import { SubmissionAnswers } from "../SubmissionAnswers";

const { default: i18n } = await import("../../../../i18n");

beforeEach(async () => {
  await i18n.changeLanguage("pt");
});

const FIELDS: readonly IntakeField[] = [
  {
    key: "bookProgress",
    type: "progressRows",
    required: false,
    labelKey: "forms_q_chapters",
    maxLength: null,
    options: [],
  },
  { key: "voice", type: "longText", required: false, labelKey: "forms_q_voice", maxLength: 4000, options: [] },
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

const detail = (over: Partial<ReceivedSubmissionDetail> = {}): ReceivedSubmissionDetail => ({
  id: "s1",
  kind: "pulso",
  projectId: "kadiweu",
  languageName: "Kadiwéu",
  submittedBy: "Fresia",
  receivedAt: "2026-10-01",
  definitionVersion: 2,
  appliedAt: null,
  fields: FIELDS,
  answers: {},
  answersWithheld: false,
  ...over,
});

const render = (value: ReceivedSubmissionDetail) =>
  renderToStaticMarkup(createElement(SubmissionAnswers, { detail: value }));

const LINK = 'data-photo-link=""';
const pendingImageLink = async () => ({ url: "data:image/png;base64,AAAA", expiresInMinutes: 15 });
const renderLinked = (value: ReceivedSubmissionDetail) =>
  renderToStaticMarkup(createElement(SubmissionAnswers, { detail: value, pendingImageLink }));
const attached = { image: "intake-image-7", imageDescription: "A equipe no vale", imageAuthorized: true };

describe("a caixa de entrada abre um Pulso e mostra a imagem pela palavra (OBT-580)", () => {
  it("imagem anexada, a descrição e a autorização marcada", () => {
    const markup = render(
      detail({
        answers: { image: "intake-image-7", imageDescription: "A equipe no vale", imageAuthorized: true },
      }),
    );
    expect(markup).toContain(i18n.t("forms_submission_image_attached"));
    expect(markup).toContain("A equipe no vale");
    expect(markup).toContain(i18n.t("forms_answer_yes"));
    expect(markup).not.toContain("<img");
  });

  it("sem imagem e sem a caixa: diz que não há, e que não foi autorizado", () => {
    const markup = render(detail({ answers: { voice: "Seguimos bem." } }));
    expect(markup).toContain(i18n.t("forms_submission_image_none"));
    expect(markup).toContain(i18n.t("forms_answer_no"));
    expect(markup).toContain("Seguimos bem.");
  });

  it("quem não lê a verdade recebe a frase, e nenhuma resposta", () => {
    const markup = render(
      detail({ answersWithheld: true, answers: { imageDescription: "não devia aparecer" } }),
    );
    expect(markup).toContain(i18n.t("forms_submission_withheld"));
    expect(markup).not.toContain("não devia aparecer");
    expect(markup).not.toContain(i18n.t("forms_q_image"));
  });
});

describe("as linhas de progresso concordam com o número", () => {
  it("uma linha no singular, duas no plural, nas duas línguas", async () => {
    const one = render(detail({ answers: { bookProgress: [{ book: "Marcos" }] } }));
    const two = render(detail({ answers: { bookProgress: [{ book: "Marcos" }, { book: "Lucas" }] } }));
    expect(one).toContain("1 linha de progresso");
    expect(two).toContain("2 linhas de progresso");
    await i18n.changeLanguage("en");
    expect(render(detail({ answers: { bookProgress: [{ book: "Mark" }] } }))).toContain("1 progress row<");
    await i18n.changeLanguage("pt");
  });
});

describe("a foto do Pulso pendente é pedida só quando o servidor diz que a rota serve (OBT-674)", () => {
  it("autorizada e servida: o pedido do link é montado sob a palavra, e a URL ainda não existe", () => {
    const markup = renderLinked(detail({ answers: attached, pendingImage: true }));
    expect(markup).toContain(LINK);
    expect(markup).toContain(i18n.t("forms_submission_image_attached"));
    expect(markup).not.toContain("<img");
    expect(markup).not.toContain("data:image");
  });

  it("não autorizada (ou um leitor que a rota recusa): pendingImage falso, nenhum pedido montado", () => {
    const markup = renderLinked(
      detail({ answers: { ...attached, imageAuthorized: false }, pendingImage: false }),
    );
    expect(markup).not.toContain(LINK);
    expect(markup).toContain(i18n.t("forms_submission_image_attached"));
  });

  it("um servidor de antes da OBT-585, sem o campo, também não monta o pedido", () => {
    expect(renderLinked(detail({ answers: attached }))).not.toContain(LINK);
  });

  it("retido: a frase, e nenhum pedido — mesmo que o bit viesse", () => {
    const markup = renderLinked(detail({ answersWithheld: true, answers: {}, pendingImage: true }));
    expect(markup).toContain(i18n.t("forms_submission_withheld"));
    expect(markup).not.toContain(LINK);
  });

  it("sem imagem anexada não há o que pedir", () => {
    const markup = renderLinked(detail({ answers: { voice: "Seguimos bem." }, pendingImage: true }));
    expect(markup).toContain(i18n.t("forms_submission_image_none"));
    expect(markup).not.toContain(LINK);
  });

  it("a frase não promete mais que a tela não mostra a foto, nas duas línguas", async () => {
    expect(i18n.t("forms_submission_image_attached")).not.toMatch(/não a mostra/u);
    await i18n.changeLanguage("en");
    expect(i18n.t("forms_submission_image_attached")).not.toMatch(/does not show/u);
    await i18n.changeLanguage("pt");
  });
});
