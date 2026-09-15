import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it } from "vitest";

const { default: i18n } = await import("../../../../i18n");
const { SubmitOutcomeNote } = await import("../SubmitOutcomeNote");

beforeEach(async () => {
  await i18n.changeLanguage("pt");
});

const render = (
  outcome: Parameters<typeof SubmitOutcomeNote>[0]["outcome"],
) => renderToStaticMarkup(createElement(SubmitOutcomeNote, { outcome }));

describe("SubmitOutcomeNote — a recusa não some com o que foi respondido", () => {
  it("uma falha de transporte nomeia a falha e promete o rascunho intacto", () => {
    const markup = render({
      kind: "failed",
      failure: { kind: "offline", status: null, code: null, detail: null },
    });

    expect(markup).toContain(i18n.t("net_offline"));
    expect(markup).toContain(i18n.t("record_save_failed"));
  });

  it("uma recusa 422 lista o que o servidor apontou", () => {
    const markup = render({
      kind: "invalid",
      errors: [
        {
          field: null,
          index: null,
          message: "an assessment rates at least one dimension",
        },
      ],
    });

    expect(markup).toContain(i18n.t("net_invalid"));
    expect(markup).toContain("an assessment rates at least one dimension");
  });

  it("uma recusa 422 sem detalhe ainda diz que nada foi aplicado", () => {
    const markup = render({ kind: "invalid", errors: [] });
    expect(markup).toContain(i18n.t("net_invalid"));
    expect(markup).toContain(i18n.t("record_save_failed"));
  });
});
