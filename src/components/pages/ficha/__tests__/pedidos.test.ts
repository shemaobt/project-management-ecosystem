import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { RequestCard } from "../../../../types/request";
import type { RequestAction } from "../../../../utils/requests";

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
const { RequestsPanel } = await import("../pedidos/RequestsPanel");
const { RequestButton } = await import("../pedidos/RequestButton");
const { readCard } = await import("../../../../services/api/resourceRequests");
const { formatMoney } = await import("../../../../utils/currency");
const { requestAction } = await import("../../../../utils/requests");

const SENT: RequestCard = {
  id: "r-1",
  reg_name: "Tradução do Evangelho de Marcos",
  request_type: "traducao",
  amount_requested: "12500.00",
  currency: "BRL",
  stage: "condicional",
  created_at: "2026-09-02T12:00:00+00:00",
  submitted_at: "2026-09-10T12:00:00+00:00",
  endorsed: true,
  decision: "conditional",
  open: false,
  can_edit: false,
  started_by_name: null,
};

const DRAFT: RequestCard = {
  ...SENT,
  id: "r-2",
  reg_name: "",
  request_type: "equipamentos",
  amount_requested: null,
  stage: "triagem",
  created_at: "2026-09-25T12:00:00+00:00",
  submitted_at: null,
  endorsed: false,
  decision: null,
  open: true,
  can_edit: false,
  started_by_name: "Membro Dois",
};

const panel = (cards: readonly RequestCard[] | null, error: string | null = null) =>
  renderToStaticMarkup(createElement(RequestsPanel, { cards, error, action: null }));

const button = (action: RequestAction | null, formAvailable = true) =>
  renderToStaticMarkup(
    createElement(RequestButton, {
      action,
      formAvailable,
      opening: false,
      onOpen: () => {},
      onRetry: () => {},
    }),
  );

beforeEach(async () => {
  await i18n.changeLanguage("pt");
});

describe("o painel dos pedidos na ficha — a projeção da BE-24", () => {
  it("cada pedido mostra nome registrado, tipo, valor, etapa e endosso", () => {
    const html = panel([SENT]);
    expect(html).toContain("Tradução do Evangelho de Marcos");
    expect(html).toContain(i18n.t("request_type_traducao"));
    expect(html).toContain(formatMoney("12500.00", "BRL", "pt-BR"));
    expect(html).toContain(i18n.t("request_stage_condicional"));
    expect(html).toContain(i18n.t("rr_card_endorsed"));
  });

  it("sem endosso, o pedido na triagem espera o líder; o recusado sem endosso não espera nada", () => {
    const waiting = panel([{ ...SENT, stage: "triagem", endorsed: false }]);
    expect(waiting).toContain(i18n.t("rr_card_awaiting_endorsement"));
    expect(waiting).not.toContain(i18n.t("rr_card_not_endorsed"));

    const declined = panel([{ ...SENT, stage: "recusado", endorsed: false, decision: "declined" }]);
    expect(declined).toContain(i18n.t("rr_card_not_endorsed"));
    expect(declined).not.toContain(i18n.t("rr_card_awaiting_endorsement"));
  });

  it("o rascunho aberto diz que está em preenchimento, sem etapa nem endosso, e sem nome inventado", () => {
    const html = panel([DRAFT]);
    expect(html).toContain(i18n.t("rr_card_open"));
    expect(html).toContain(i18n.t("notif_request_unnamed"));
    expect(html).toContain(i18n.t("request_type_equipamentos"));
    expect(html).toContain(i18n.t("rr_card_no_amount"));
    expect(html).not.toContain(i18n.t("request_stage_triagem"));
    expect(html).not.toContain(i18n.t("rr_card_endorsed"));
    expect(html).not.toContain(i18n.t("rr_card_awaiting_endorsement"));
  });

  it("nada da avaliação, nem local, nem base — o que o fio trouxer a mais não chega à tela", () => {
    const wire = {
      ...SENT,
      scores: { alinhamento: 4, custo: 2 },
      comments: "NOTA-DA-MESA-SENTINELA",
      team_note: "RECADO-SENTINELA",
      evaluator: "AVALIADOR-SENTINELA",
      attendees: ["PRESENTE-SENTINELA"],
      location: "LOCAL-SENTINELA",
      base: "BASE-SENTINELA",
    };
    const html = panel([readCard(wire)]);
    expect(html).toContain("Tradução do Evangelho de Marcos");
    for (const sentinel of [
      "NOTA-DA-MESA",
      "RECADO",
      "AVALIADOR",
      "PRESENTE",
      "LOCAL-SENTINELA",
      "BASE-SENTINELA",
    ]) {
      expect(html, sentinel).not.toContain(sentinel);
    }
  });

  it("projeto sem pedido diz isso; carregando não é vazio; a falha fala", () => {
    const empty = panel([]);
    expect(empty).toContain(i18n.t("rr_panel_empty"));
    expect(empty).not.toContain("<li");

    const loading = panel(null);
    expect(loading).toContain('role="status"');
    expect(loading).not.toContain(i18n.t("rr_panel_empty"));

    const failed = panel(null, "Não foi possível carregar.");
    expect(failed).toContain('role="alert"');
    expect(failed).not.toContain(i18n.t("rr_panel_empty"));
  });

  it("fala as duas línguas", async () => {
    await i18n.changeLanguage("en");
    const html = panel([SENT]);
    expect(html).toContain("Translation of a language");
    expect(html).toContain("Conditionally approved");
    expect(panel([])).toContain("This project has no resource request yet.");
  });
});

describe("o botão muda conforme a instância", () => {
  it("sem instância: Solicitar recurso, um botão que abre numa aba nova", () => {
    const html = button(requestAction([SENT], "yes"));
    expect(html).toContain("<button");
    expect(html).toContain(i18n.t("rr_start"));
    expect(html).toContain(i18n.t("rr_opens_new_tab"));
  });

  it("com instância minha: Continuar", () => {
    const html = button(requestAction([SENT, { ...DRAFT, can_edit: true }], "no"));
    expect(html).toContain("<button");
    expect(html).toContain(i18n.t("rr_continue"));
    expect(html).not.toContain(i18n.t("rr_start"));
  });

  it("com instância de outro: Em preenchimento por X, e sem botão", () => {
    const html = button(requestAction([DRAFT], "yes"));
    expect(html).toContain(i18n.t("rr_in_progress_by", { name: "Membro Dois" }));
    expect(html).not.toContain("<button");
  });

  it("enquanto a membresia é lida, o espaço diz que está conferindo — não é 'não membro'", () => {
    const html = button(requestAction([SENT], "checking"));
    expect(html).toContain('role="status"');
    expect(html).toContain(i18n.t("rr_membership_checking"));
    expect(html).not.toContain(i18n.t("rr_start"));
  });

  it("membresia que não foi lida fala e oferece tentar de novo, em vez de sumir com o botão", () => {
    const html = button(requestAction([SENT], "unread"));
    expect(html).toContain('role="alert"');
    expect(html).toContain(i18n.t("rr_membership_unread"));
    expect(html).toContain(i18n.t("net_retry"));
    expect(html).not.toContain(i18n.t("rr_start"));
  });

  it("instância aberta decide sozinha, com a membresia ainda em voo ou sem leitura", () => {
    expect(button(requestAction([DRAFT], "checking"))).toContain(
      i18n.t("rr_in_progress_by", { name: "Membro Dois" }),
    );
    expect(button(requestAction([{ ...DRAFT, can_edit: true }], "unread"))).toContain(
      i18n.t("rr_continue"),
    );
  });

  it("quem não pode iniciar não vê botão nenhum", () => {
    expect(button(requestAction([SENT], "no"))).toBe("");
    expect(button(null)).toBe("");
  });

  it("sem o endereço do formulário, o botão não aparece — o aviso diz por quê", () => {
    const html = button(requestAction([], "yes"), false);
    expect(html).not.toContain("<button");
    expect(html).toContain(i18n.t("rr_form_unavailable", { admin: i18n.t("role_admin") }));
  });
});

describe("a ficha liga o painel à aba Recursos e à passagem", () => {
  const read = (path: string) =>
    readFileSync(join(process.cwd(), path), "utf8").replace(/\s+/gu, "");

  it("só com registro salvo e com a camada de API, e remonta por projeto", () => {
    const tab = read("src/components/pages/ficha/tabs/Recursos.tsx");
    expect(tab).toContain("constprojectId=draft.saved?.id;");
    expect(tab).toContain(
      "{projectId&&resourceRequestsAPI?(<ProjectRequestskey={projectId}api={resourceRequestsAPI}projectId={projectId}/>",
    );
  });

  it("lê os cartões do projeto e abre o formulário com o projeto no contexto", () => {
    const wired = read("src/components/pages/ficha/pedidos/ProjectRequests.tsx");
    expect(wired).toContain(".projectRequests(projectId)");
    expect(wired).toContain("useResourceForm(apps.resourceRequestForm)");
    expect(wired).toContain("open(projectContext(projectId))");
    expect(wired).toContain("setMembershipFailed(true)");
    expect(wired).not.toContain("setMemberOf([])");
  });
});
