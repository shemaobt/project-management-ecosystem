import { createElement, type ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AwaitingProject, ConfirmedProject } from "../../../../types/access";

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
const { ConfirmedNote, DiscardReason, PendingState } = await import("../PendingProjects");
const { PendingProjectForm } = await import("../PendingProjectForm");
const { keepConfirmation, membersToSend } = await import("../pending");

beforeEach(async () => {
  await i18n.changeLanguage("pt");
});

const render = (element: ReactElement) =>
  renderToStaticMarkup(createElement(MemoryRouter, null, element));

const escaped = (text: string) =>
  text.replace(/&/gu, "&amp;").replace(/'/gu, "&#x27;").replace(/"/gu, "&quot;");

const noop = () => undefined;

const PROJECT: AwaitingProject = {
  id: "p-1",
  languageName: "Língua Teste",
  languageCode: "ltt",
  location: "Peru, Vale Teste",
  team: "",
  requestId: "r-1",
  requestName: "Projeto Língua Teste",
  filedAt: "2026-09-30T12:00:00Z",
  members: [
    { name: "Ana Teste", role: "coordenação", email: "" },
    { name: "Joana Teste", role: "", email: "equipe@exemplo.org" },
  ],
  locationWithheld: false,
};

function form(project: AwaitingProject = PROJECT) {
  return render(
    createElement(PendingProjectForm, {
      project,
      working: false,
      refusal: null,
      onConfirm: noop,
      onDiscard: noop,
    }),
  );
}

describe("a conferência de um projeto aguardando confirmação", () => {
  it("abre com os campos pré-preenchidos do formulário e o pedido de onde veio", () => {
    const out = form();
    expect(out).toContain('value="Língua Teste"');
    expect(out).toContain('value="ltt"');
    expect(out).toContain('value="Peru, Vale Teste"');
    expect(out).toContain(i18n.t("f_lang_name"));
    expect(out).toContain(i18n.t("f_location"));
    expect(out).toContain(i18n.t("f_facilitators"));
    expect(out).toContain("Projeto Língua Teste");
  });

  it("traz o país sensível desmarcado, com a explicação da ficha", () => {
    const out = form();
    expect(out).toContain(i18n.t("f_sensitive"));
    expect(out).toContain(i18n.t("f_sensitive_hint"));
    expect(out).toMatch(/role="checkbox"[^>]*aria-checked="false"/u);
  });

  it("lista as pessoas com o e-mail editável — o do link já preenchido, os da A4 vazios", () => {
    const out = form();
    expect(out).toContain('value="Ana Teste"');
    expect(out).toContain("coordenação");
    expect(out).toContain('value="equipe@exemplo.org"');
    expect(out.match(/type="email"/gu)).toHaveLength(2);
    expect(out).toContain(i18n.t("acesso_pending_members_hint"));
    expect(out).toContain(i18n.t("acesso_pending_member_add"));
    expect(out).toContain(escaped(i18n.t("acesso_pending_member_remove", { name: "Ana Teste" })));
  });

  it("confirmar e descartar estão lá; sem nome de língua, confirmar fica desligado e diz por quê", () => {
    const out = form();
    expect(out).toContain(i18n.t("acesso_pending_confirm"));
    expect(out).toContain(i18n.t("acesso_pending_discard"));

    const nameless = form({ ...PROJECT, languageName: "" });
    expect(nameless).toContain(i18n.t("acesso_pending_name_required"));
    expect(nameless).toMatch(/<button[^>]*type="submit"[^>]*disabled=""/u);
  });

  it("linha sem nome e sem e-mail não vai ao servidor; a que tem um dos dois vai, aparada", () => {
    expect(
      membersToSend([
        { key: "a", name: " Ana Teste ", role: "coordenação", email: "" },
        { key: "b", name: "", role: "", email: " equipe@exemplo.org " },
        { key: "c", name: "", role: "", email: "" },
        { key: "d", name: "   ", role: "", email: "  " },
      ]),
    ).toEqual([
      { name: "Ana Teste", email: "" },
      { name: "", email: "equipe@exemplo.org" },
    ]);
  });

  it("fala inglês quando o console fala inglês", async () => {
    await i18n.changeLanguage("en");
    const out = form();
    expect(out).toContain("Sensitive country for Bible distribution");
    expect(out).toContain("People on the team");
    expect(out).toContain("Confirm project");
  });
});

describe("o que a confirmação respondeu", () => {
  const RESULT: ConfirmedProject = {
    id: "p-1",
    languageName: "Língua Teste",
    requestIds: ["r-1"],
    joined: [{ email: "ana@exemplo.org", userId: "u-1" }],
    invited: [
      {
        email: "equipe@exemplo.org",
        inviteId: "i-1",
        inviteUrl: "https://pme.exemplo.org/convite?token=abc",
        emailSent: false,
      },
    ],
    withoutEmail: ["Bruno Teste", ""],
  };

  it("diz quem entrou, quem foi convidado e quem ficou sem e-mail, e mostra o link uma vez", () => {
    const out = render(createElement(ConfirmedNote, { result: RESULT, onDismiss: noop }));
    expect(out).toContain(escaped(i18n.t("acesso_pending_confirmed", { name: "Língua Teste" })));
    expect(out).toContain(i18n.t("acesso_pending_joined", { count: 1 }));
    expect(out).toContain(i18n.t("acesso_pending_invited", { count: 1 }));
    expect(out).toContain("Bruno Teste");
    expect(out).toContain(i18n.t("acesso_pending_member_unnamed"));
    expect(out).toContain("https://pme.exemplo.org/convite?token=abc");
    expect(out).toContain(escaped(i18n.t("acesso_invite_email_not_sent")));
  });

  it("confirmar outro projeto sem fechar o aviso não apaga os links do primeiro", () => {
    const second: ConfirmedProject = {
      ...RESULT,
      id: "p-2",
      languageName: "Outra Língua Teste",
      requestIds: ["r-2"],
      invited: [{ ...RESULT.invited[0], inviteId: "i-2", inviteUrl: "https://pme.exemplo.org/convite?token=def" }],
    };
    const kept = keepConfirmation(keepConfirmation([], RESULT), second);
    expect(kept.map((result) => result.id)).toEqual(["p-1", "p-2"]);

    const out = kept
      .map((result) => render(createElement(ConfirmedNote, { result, onDismiss: noop })))
      .join("");
    expect(out).toContain("https://pme.exemplo.org/convite?token=abc");
    expect(out).toContain("https://pme.exemplo.org/convite?token=def");
  });

  it("a mesma resposta não vira dois avisos", () => {
    expect(keepConfirmation([RESULT], RESULT)).toEqual([RESULT]);
  });
});

describe("o descarte pede o motivo e diz por quê", () => {
  const dialog = (reason: string) =>
    render(createElement(DiscardReason, { reason, onChange: noop }));

  it("sem motivo, a frase de obrigatório aparece e descreve o campo", () => {
    for (const reason of ["", "   "]) {
      const out = dialog(reason);
      expect(out).toContain(i18n.t("acesso_pending_discard_reason_required"));
      expect(out).toMatch(/<textarea[^>]*aria-describedby="([^"]+)"[\s\S]*<p id="\1"/u);
    }
  });

  it("com motivo, a frase some", () => {
    const out = dialog("Pedido em duplicidade");
    expect(out).not.toContain(i18n.t("acesso_pending_discard_reason_required"));
    expect(out).not.toContain("aria-describedby");
  });

  it("fala inglês quando o console fala inglês", async () => {
    await i18n.changeLanguage("en");
    expect(dialog("")).toContain("A reason is required to discard.");
  });
});

describe("a lista vazia, carregando e em erro", () => {
  it("cada estado tem a sua frase, e com projetos não diz nada", () => {
    expect(render(createElement(PendingState, { projects: [], error: null, onRetry: noop }))).toContain(
      i18n.t("acesso_pending_empty"),
    );
    expect(render(createElement(PendingState, { projects: null, error: null, onRetry: noop }))).toContain(
      i18n.t("loading"),
    );
    expect(
      render(createElement(PendingState, { projects: null, error: "fora do ar", onRetry: noop })),
    ).toContain(i18n.t("net_retry"));
    expect(render(createElement(PendingState, { projects: [PROJECT], error: null, onRetry: noop }))).toBe("");
  });
});
