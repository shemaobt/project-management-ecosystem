import { createElement, type ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The project list is a network read against the server (OBT-557). A failed one is said, with a
 * retry, instead of a spinner that never ends; a count is never drawn before the list is read.
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

const { default: i18n } = await import("../../../i18n");
const { InicioView } = await import("../inicio");
const { RelatorioView } = await import("../ritmo/relatorio/RelatorioPage");
const { FormulariosView } = await import("../formularios");
const { LeaderLinkDialogBody } = await import("../dados/LeaderLinkDialog");
const { EquipeView } = await import("../equipe");

const render = (element: ReactElement): string =>
  renderToStaticMarkup(createElement(MemoryRouter, null, element));

const OFFLINE = { kind: "offline" as const, status: null, code: null, detail: null };
const retry = () => {};

beforeEach(async () => {
  await i18n.changeLanguage("pt");
});

describe("uma leitura que falhou diz isso, com tentar de novo", () => {
  const said = (markup: string) => {
    expect(markup).toContain('role="alert"');
    expect(markup).toContain(i18n.t("net_retry"));
    expect(markup).not.toContain(`<span class="sr-only">${i18n.t("loading")}</span>`);
  };

  it("Início", () => {
    said(render(createElement(InicioView, { projects: null, onOpen: retry, loadFailure: OFFLINE, onRetry: retry })));
  });

  it("relatório anual", () => {
    said(
      render(
        createElement(RelatorioView, {
          projects: null,
          year: 2026,
          onYearChange: retry,
          loadFailure: OFFLINE,
          onRetry: retry,
        }),
      ),
    );
  });

  it("Formulários", () => {
    said(render(createElement(FormulariosView, { projects: null, loadFailure: OFFLINE, onRetry: retry })));
  });

  it("Link do líder", () => {
    said(
      render(
        createElement(LeaderLinkDialogBody, {
          projects: null,
          selectedProjectId: "",
          onSelectProject: retry,
          links: null,
          minted: null,
          minting: false,
          onMint: retry,
          onRevoke: retry,
          error: null,
          loadFailure: OFFLINE,
          onRetry: retry,
        }),
      ),
    );
  });
});

describe("a Equipe não conta antes de ler", () => {
  it("as regiões aparecem, sem um 0 projetos que ninguém contou", () => {
    const markup = render(
      createElement(EquipeView, {
        regions: [
          {
            key: "south-america",
            labelKey: "continent_south_america",
            team: { coordinator: "", obtLab: "", resourceCircle: "" },
          },
        ],
        projects: null,
        onSave: async () => ({ ok: true }) as never,
      }),
    );

    expect(markup).toContain(i18n.t("continent_south_america"));
    expect(markup).not.toContain(i18n.t("equipe_projects_count", { count: 0 }));
  });
});
