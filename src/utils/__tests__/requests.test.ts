import { describe, expect, it } from "vitest";
import type { RequestCard } from "../../types/request";
import {
  formEntryUrl,
  mayStartRequest,
  openInstance,
  openResourceForm,
  projectContext,
  requestAction,
  requestLinkUrl,
  type FormTab,
  type HandoffContext,
} from "../requests";

const BASE = "https://formulario.exemplo.org";

const card = (over: Partial<RequestCard>): RequestCard => ({
  id: "r-1",
  reg_name: "Pedido Exemplo",
  request_type: "traducao",
  amount_requested: "1500.00",
  currency: "BRL",
  stage: "triagem",
  created_at: "2026-09-20T12:00:00+00:00",
  submitted_at: "2026-09-21T12:00:00+00:00",
  endorsed: false,
  decision: null,
  open: false,
  can_edit: false,
  started_by_name: null,
  ...over,
});

const DRAFT_OF_OTHER = card({
  id: "r-2",
  submitted_at: null,
  open: true,
  can_edit: false,
  started_by_name: "Membro Dois",
});

const DRAFT_I_WRITE = card({
  id: "r-3",
  submitted_at: null,
  open: true,
  can_edit: true,
  started_by_name: "Eu Mesmo",
});

describe("o botão lê a instância aberta — BE-24 × BE-25", () => {
  it("sem instância aberta, quem pode iniciar vê Solicitar recurso", () => {
    expect(requestAction([], true)).toEqual({ kind: "start" });
    expect(requestAction([card({})], true)).toEqual({ kind: "start" });
  });

  it("um pedido já enviado não trava o projeto — só a instância aberta trava", () => {
    const sent = card({ stage: "aprovado", submitted_at: "2026-09-21T12:00:00+00:00" });
    expect(openInstance([sent])).toBeNull();
    expect(requestAction([sent], true)).toEqual({ kind: "start" });
  });

  it("instância que eu escrevo diz Continuar, mesmo para quem não poderia iniciar", () => {
    expect(requestAction([card({}), DRAFT_I_WRITE], true)).toEqual({ kind: "continue" });
    expect(requestAction([DRAFT_I_WRITE], false)).toEqual({ kind: "continue" });
  });

  it("instância de outro diz quem está preenchendo, e não há botão", () => {
    expect(requestAction([DRAFT_OF_OTHER], true)).toEqual({
      kind: "inProgress",
      by: "Membro Dois",
    });
    expect(requestAction([{ ...DRAFT_OF_OTHER, started_by_name: null }], true)).toEqual({
      kind: "inProgress",
      by: null,
    });
  });

  it("quem não é membro nem Admin não inicia", () => {
    expect(requestAction([], false)).toEqual({ kind: "none" });
  });
});

describe("quem inicia um pedido na ficha", () => {
  it("o Admin, em qualquer projeto", () => {
    expect(mayStartRequest(["globalStrategist", "admin", "gestor"], [], "kadiweu")).toBe(true);
  });

  it("o membro, no projeto dele e só nele", () => {
    expect(mayStartRequest(["coordinator"], ["kadiweu"], "kadiweu")).toBe(true);
    expect(mayStartRequest(["coordinator"], ["kadiweu"], "ashaninka")).toBe(false);
  });

  it("papel sem membresia não basta — nem a coordenação, nem a mesa", () => {
    expect(mayStartRequest(["coordinator"], [], "kadiweu")).toBe(false);
    expect(mayStartRequest(["mesa"], [], "kadiweu")).toBe(false);
  });
});

describe("os endereços nascem da base que a sessão entrega", () => {
  it("o código vai no fragmento, que o navegador não manda a servidor nenhum", () => {
    const url = formEntryUrl(BASE, "abc_DEF-123");
    expect(url).toBe(`${BASE}/entrar#code=abc_DEF-123`);
    expect(new URL(url).search).toBe("");
    expect(new URL(url).hash).toBe("#code=abc_DEF-123");
  });

  it("um código com caractere de URL não quebra o fragmento", () => {
    expect(formEntryUrl(BASE, "a+b/c=")).toBe(`${BASE}/entrar#code=a%2Bb%2Fc%3D`);
  });

  it("o link externo é a página pública do formulário, /solicitar/{token}", () => {
    expect(requestLinkUrl(BASE, "tok-1")).toBe(`${BASE}/solicitar/tok-1`);
    expect(requestLinkUrl("https://outro.exemplo.org", "tok-1")).toBe(
      "https://outro.exemplo.org/solicitar/tok-1",
    );
  });
});

interface Recorded {
  handoffs: [string, HandoffContext | null][];
  navigated: string[];
  closed: number;
  tab: FormTab;
}

function recorder(): Recorded {
  const recorded: Recorded = {
    handoffs: [],
    navigated: [],
    closed: 0,
    tab: {
      opener: "a janela do PME",
      location: { replace: (url) => void recorded.navigated.push(url) },
      close: () => {
        recorded.closed += 1;
      },
    },
  };
  return recorded;
}

describe("o clique pede a passagem e abre o formulário — BE-21", () => {
  it("pede a passagem para o formulário, com o projeto, e abre a aba no /entrar com o código", async () => {
    const recorded = recorder();
    const outcome = await openResourceForm({
      base: BASE,
      context: projectContext("kadiweu"),
      handoff: async (appKey, context) => {
        recorded.handoffs.push([appKey, context]);
        return "codigo-de-um-minuto";
      },
      openTab: () => recorded.tab,
    });

    expect(outcome).toEqual({ kind: "opened" });
    expect(recorded.handoffs).toEqual([["resource-request-form", { projectId: "kadiweu" }]]);
    expect(recorded.navigated).toEqual([`${BASE}/entrar#code=codigo-de-um-minuto`]);
    expect(recorded.tab.opener).toBeNull();
    expect(recorded.closed).toBe(0);
  });

  it("a entrada Círculo de Recursos pede a passagem sem contexto", async () => {
    const recorded = recorder();
    await openResourceForm({
      base: BASE,
      context: null,
      handoff: async (appKey, context) => {
        recorded.handoffs.push([appKey, context]);
        return "c";
      },
      openTab: () => recorded.tab,
    });
    expect(recorded.handoffs).toEqual([["resource-request-form", null]]);
  });

  it("a aba nasce antes da passagem — um popup depois do await é bloqueado", async () => {
    const order: string[] = [];
    const recorded = recorder();
    await openResourceForm({
      base: BASE,
      context: null,
      handoff: async () => {
        order.push("handoff");
        return "c";
      },
      openTab: () => {
        order.push("tab");
        return recorded.tab;
      },
    });
    expect(order).toEqual(["tab", "handoff"]);
  });

  it("aba bloqueada não cunha código nenhum", async () => {
    const recorded = recorder();
    const outcome = await openResourceForm({
      base: BASE,
      context: null,
      handoff: async (appKey, context) => {
        recorded.handoffs.push([appKey, context]);
        return "c";
      },
      openTab: () => null,
    });
    expect(outcome).toEqual({ kind: "blocked" });
    expect(recorded.handoffs).toEqual([]);
  });

  it("passagem recusada fecha a aba e não navega", async () => {
    const recorded = recorder();
    const refusal = new Error("403");
    const outcome = await openResourceForm({
      base: BASE,
      context: projectContext("kadiweu"),
      handoff: async () => {
        throw refusal;
      },
      openTab: () => recorded.tab,
    });
    expect(outcome).toEqual({ kind: "failed", error: refusal });
    expect(recorded.closed).toBe(1);
    expect(recorded.navigated).toEqual([]);
  });
});
