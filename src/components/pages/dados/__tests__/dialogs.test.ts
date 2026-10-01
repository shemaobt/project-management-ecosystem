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

describe("o Link do líder declara escopo e validade, e agora gera de verdade", () => {
  const base: Omit<
    Parameters<typeof LeaderLinkDialogBody>[0],
    "projects"
  > = {
    selectedProjectId: "",
    onSelectProject: noop,
    links: null,
    minted: null,
    minting: false,
    onMint: noop,
    onRevoke: noop,
    error: null,
  };

  const markup = (
    over: Partial<typeof base> & { projects: Project[] | null },
  ) =>
    renderToStaticMarkup(
      createElement(LeaderLinkDialogBody, { ...base, ...over }),
    );

  it("escopo e validade aparecem em palavras", () => {
    const out = markup({ projects: [project()] });

    expect(out).toContain(i18n.t("intake_desc"));
    expect(out).toContain(i18n.t("intake_scope"));
    expect(out).toContain(i18n.t("intake_expiry"));
  });

  it("carregando os projetos não vira lista vazia", () => {
    const out = markup({ projects: null });

    expect(out).toContain(i18n.t("loading"));
    expect(out).not.toContain(i18n.t("forms_no_projects"));
  });

  it("sem projeto nenhum, explica em vez de mostrar o formulário vazio", () => {
    const out = markup({ projects: [] });

    expect(out).toContain(i18n.t("forms_no_projects"));
  });

  it("o link recém-gerado avisa que só aparece uma vez, e nunca promete extensão de arquivo", () => {
    const out = markup({
      projects: [project()],
      selectedProjectId: "tikuna",
      minted: {
        id: "link-1",
        projectId: "tikuna",
        definitionVersion: 1,
        expiresAt: "2026-10-30",
        status: "pending",
        createdAt: "2026-09-15",
        usedAt: null,
        revokedAt: null,
        token: "abc123",
        url: "http://localhost:5173/intake/abc123",
      },
    });

    expect(out).toContain(i18n.t("intake_link_once"));
    expect(out).toContain("http://localhost:5173/intake/abc123");
    expect(out).not.toMatch(FORMAT);
  });

  it("a lista de links mostra o status, nunca o token", () => {
    const out = markup({
      projects: [project()],
      selectedProjectId: "tikuna",
      links: [
        {
          id: "link-1",
          projectId: "tikuna",
          definitionVersion: 1,
          expiresAt: "2026-10-30",
          status: "revoked",
          createdAt: "2026-09-01",
          usedAt: null,
          revokedAt: "2026-09-10",
        },
      ],
    });

    expect(out).toContain(i18n.t("intake_status_revoked"));
    expect(out).not.toContain("abc123");
  });
});

describe("o Exportar é do servidor (INT-11)", () => {
  const markup = (over: Partial<Parameters<typeof ExportDialogBody>[0]> = {}) =>
    renderToStaticMarkup(
      createElement(ExportDialogBody, {
        available: true,
        run: { status: "idle" },
        onDownload: noop,
        ...over,
      }),
    );

  it("diz o que sai e o aviso antes do download, com os dois formatos", () => {
    const out = markup();

    expect(out).toContain(i18n.t("export_contains"));
    expect(out).toContain(i18n.t("export_confidential"));
    expect(out).toContain(i18n.t("export_json"));
    expect(out).toContain(i18n.t("export_csv"));
  });

  it("sem servidor não há exportação de reserva: diz isso e não oferece botão", () => {
    const out = markup({ available: false });

    expect(out).toContain(i18n.t("export_needs_server"));
    expect(out).not.toContain(i18n.t("export_json"));
  });

  it("em andamento, mostra o progresso real e que dá para continuar trabalhando", () => {
    const out = markup({
      run: { status: "running", progress: { loaded: 512 * 1024, total: 1024 * 1024 } },
    });

    expect(out).toContain('role="progressbar"');
    expect(out).toContain('aria-valuenow="50"');
    expect(out).toContain(i18n.t("export_keep_working"));
    expect(out).not.toContain(i18n.t("export_json"));
  });

  it("sem o tamanho do arquivo, conta os bytes e não inventa porcentagem", () => {
    const out = markup({
      run: { status: "running", progress: { loaded: 3 * 1024, total: null } },
    });

    expect(out).toContain(i18n.t("export_progress_bytes", { size: "3 KB" }));
    expect(out).not.toContain("aria-valuenow");
  });

  it("uma recusa do servidor tem a frase dela, e os botões voltam", () => {
    const out = markup({
      run: {
        status: "failed",
        failure: { kind: "forbidden", status: 403, code: null, detail: null },
      },
    });

    expect(out).toContain(i18n.t("net_forbidden"));
    expect(out).toContain(i18n.t("export_json"));
  });
});

describe("o Importar mostra o efeito antes de aplicar, e recusa dizendo o porquê", () => {
  const body = (over: Partial<Parameters<typeof ImportDialogBody>[0]> = {}) =>
    renderToStaticMarkup(
      createElement(ImportDialogBody, {
        target: "server",
        allowed: true,
        pick: null,
        applying: false,
        refusal: null,
        onChoose: noop,
        onApply: noop,
        ...over,
      }),
    );
  const picked = (records: unknown[]) => {
    const raw = JSON.stringify(records);
    return { fileName: "backup", raw, result: parseProjectsImport(raw) };
  };

  it("antes do arquivo, explica a regra e oferece a escolha", () => {
    const out = body();

    expect(out).toContain(i18n.t("import_desc"));
    expect(out).toContain(i18n.t("import_choose"));
    expect(out).not.toContain(i18n.t("import_apply_server"));
  });

  it("quem não é coordenação não recebe o seletor — recebe de quem é a importação", () => {
    const out = body({ allowed: false });

    expect(out).toContain(i18n.t("import_coordination_only"));
    expect(out).not.toContain(i18n.t("import_choose"));
  });

  it("contra o servidor, a prévia nomeia os projetos e diz as regras da gravação", () => {
    const out = body({
      pick: picked([
        { id: "a", languageName: "Tikuna" },
        { id: "b", languageName: "Kaingang" },
      ]),
    });

    expect(out).toContain(i18n.t("import_ready", { count: 2 }));
    expect(out).toContain("Tikuna");
    expect(out).toContain("Kaingang");
    expect(out).toContain(i18n.t("import_preview_kept"));
    expect(out).toContain(i18n.t("import_preview_prayer"));
    expect(out).toContain(i18n.t("import_preview_server_fields"));
    expect(out).toContain(i18n.t("import_confirm_server"));
    // The fixture's wholesale replace is not what the server does.
    expect(out).not.toContain(i18n.t("confirm_import"));
  });

  it("uma lista longa nomeia dez e conta o resto", () => {
    const records = Array.from({ length: 12 }, (_, index) => ({
      id: `p${index}`,
      languageName: `Língua ${index}`,
    }));
    const out = body({ pick: picked(records) });

    expect(out).toContain("Língua 9");
    expect(out).not.toContain("Língua 10");
    expect(out).toContain(i18n.t("import_preview_more", { count: 2 }));
  });

  it("sem servidor, a importação local continua substituindo, e diz isso", () => {
    const out = body({
      target: "local",
      pick: picked([{ id: "a", languageName: "Tikuna" }]),
    });

    expect(out).toContain(i18n.t("confirm_import"));
    expect(out).toContain(i18n.t("import_apply"));
    expect(out).not.toContain(i18n.t("import_preview_kept"));
  });

  it("com arquivo quebrado, nomeia o item e afirma que nada entrou", () => {
    const out = body({ pick: picked([{ id: "a", languageName: "Tikuna" }, { id: "b" }]) });

    expect(out).toContain(i18n.t("import_bad_record", { index: 2 }));
    expect(out).toContain(i18n.t("import_none_applied"));
    expect(out).not.toContain(i18n.t("import_apply_server"));
  });

  it("uma recusa do servidor aparece com a frase dela e afirma que nada entrou", () => {
    const out = body({ refusal: i18n.t("import_duplicate_id", { id: "a" }) });

    expect(out).toContain(i18n.t("import_duplicate_id", { id: "a" }));
    expect(out).toContain(i18n.t("import_none_applied"));
  });
});
