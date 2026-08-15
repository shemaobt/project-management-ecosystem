import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

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
const { createEmptyProject } = await import("../../../../fixtures/blank");
const { parseProjectsImport } = await import("../../../../utils/export");
const { ExportDialogBody } = await import("../ExportDialog");
const { ImportDialogBody } = await import("../ImportDialog");
const { LeaderLinkDialogBody } = await import("../LeaderLinkDialog");
const { ReceiveUpdateDialogBody } = await import("../ReceiveUpdateDialog");

type Project = ReturnType<typeof createEmptyProject>;

const FORMAT = /\.(json|html|csv|pdf|xlsx?)\b/iu;

const project = (over: Partial<Project> = {}): Project => ({
  ...createEmptyProject("tikuna"),
  languageName: "Tikuna",
  location: "Brazil",
  ...over,
});

const noop = () => undefined;

beforeEach(async () => {
  await i18n.changeLanguage("pt");
});

describe("Receber Atualização não promete o que a onda 1 não entrega", () => {
  const markup = () =>
    renderToStaticMarkup(createElement(ReceiveUpdateDialogBody));

  it("diz o que o fluxo é e que a importação chega na onda 2", () => {
    expect(markup()).toContain(i18n.t("receive_desc"));
    expect(markup()).toContain(i18n.t("receive_pending"));
  });

  it("repete a sentença do GATE-03 e não nomeia extensão nenhuma", () => {
    expect(markup()).toContain(i18n.t("forms_format_pending"));
    expect(markup()).not.toMatch(FORMAT);
  });
});

describe("o Link do líder declara escopo e validade em palavras", () => {
  const markup = () =>
    renderToStaticMarkup(createElement(LeaderLinkDialogBody));

  it("escopo, validade e o que ainda não existe, os três visíveis", () => {
    expect(markup()).toContain(i18n.t("intake_desc"));
    expect(markup()).toContain(i18n.t("intake_scope"));
    expect(markup()).toContain(i18n.t("intake_expiry"));
    expect(markup()).toContain(i18n.t("intake_pending"));
  });

  it("não nomeia extensão de arquivo", () => {
    expect(markup()).not.toMatch(FORMAT);
  });
});

describe("o Exportar mostra o aviso antes do download", () => {
  it("carregando não vira zero — sem botões enquanto não há dados", () => {
    const markup = renderToStaticMarkup(
      createElement(ExportDialogBody, { projects: null, onDownload: noop }),
    );

    expect(markup).toContain(i18n.t("loading"));
    expect(markup).not.toContain(i18n.t("export_json"));
    expect(markup).not.toContain(i18n.t("export_count", { count: 0 }));
  });

  it("com dados, diz o que sai, o aviso, a contagem e o recolhimento", () => {
    const markup = renderToStaticMarkup(
      createElement(ExportDialogBody, {
        projects: [
          project(),
          project({ id: "guardado", sensitiveCountry: true }),
        ],
        onDownload: noop,
      }),
    );

    expect(markup).toContain(i18n.t("export_contains"));
    expect(markup).toContain(i18n.t("export_confidential"));
    expect(markup).toContain(i18n.t("export_count", { count: 2 }));
    expect(markup).toContain(i18n.t("export_withheld_count", { count: 1 }));
    expect(markup).toContain(i18n.t("export_json"));
    expect(markup).toContain(i18n.t("export_csv"));
  });

  it("sem país sensível, não fala em recolhimento", () => {
    const markup = renderToStaticMarkup(
      createElement(ExportDialogBody, {
        projects: [project()],
        onDownload: noop,
      }),
    );

    expect(markup).not.toContain(i18n.t("export_withheld_count", { count: 0 }));
  });
});

describe("o Importar diz que é tudo ou nada, e recusa dizendo o porquê", () => {
  it("antes do arquivo, explica a regra e oferece a escolha", () => {
    const markup = renderToStaticMarkup(
      createElement(ImportDialogBody, {
        pick: null,
        onChoose: noop,
        onApply: noop,
      }),
    );

    expect(markup).toContain(i18n.t("import_desc"));
    expect(markup).toContain(i18n.t("import_choose"));
    expect(markup).not.toContain(i18n.t("import_apply"));
  });

  it("com arquivo válido, mostra a contagem e pede a confirmação", () => {
    const result = parseProjectsImport(
      JSON.stringify([
        { id: "a", languageName: "Tikuna" },
        { id: "b", languageName: "Kaingang" },
      ]),
    );
    const markup = renderToStaticMarkup(
      createElement(ImportDialogBody, {
        pick: { fileName: "backup", result },
        onChoose: noop,
        onApply: noop,
      }),
    );

    expect(markup).toContain(i18n.t("import_ready", { count: 2 }));
    expect(markup).toContain(i18n.t("confirm_import"));
    expect(markup).toContain(i18n.t("import_apply"));
  });

  it("com arquivo quebrado, nomeia o item e afirma que nada entrou", () => {
    const result = parseProjectsImport(
      JSON.stringify([{ id: "a", languageName: "Tikuna" }, { id: "b" }]),
    );
    const markup = renderToStaticMarkup(
      createElement(ImportDialogBody, {
        pick: { fileName: "quebrado", result },
        onChoose: noop,
        onApply: noop,
      }),
    );

    expect(markup).toContain(i18n.t("import_bad_record", { index: 2 }));
    expect(markup).toContain(i18n.t("import_none_applied"));
    expect(markup).not.toContain(i18n.t("import_apply"));
  });
});
