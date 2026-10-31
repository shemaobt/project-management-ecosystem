import axios, { AxiosError, type InternalAxiosRequestConfig } from "axios";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { RequestCard } from "../../../../types/request";

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
vi.stubEnv("VITE_DATA_SOURCE", "api");

const PROJECT = "pme-682-lingala";

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

const STARTED: RequestCard = {
  ...SENT,
  id: "r-2",
  reg_name: "",
  request_type: "equipamentos",
  amount_requested: null,
  stage: "triagem",
  created_at: "2026-10-30T12:00:00+00:00",
  submitted_at: null,
  endorsed: false,
  decision: null,
  open: true,
  can_edit: true,
  started_by_name: "pme-682 Coord",
};

const calls: string[] = [];
let pages: unknown[] = [];
let held: Promise<void> | null = null;
let refusing = false;
const adapter = async (config: InternalAxiosRequestConfig) => {
  calls.push(config.url ?? "");
  if (held) await held;
  if (refusing) {
    throw new AxiosError("server down", "ERR_BAD_RESPONSE", config, null, {
      data: { detail: "boom" },
      status: 503,
      statusText: "",
      headers: {},
      config,
    });
  }
  return { data: pages.shift() ?? [], status: 200, statusText: "", headers: {}, config };
};

const { http } = await import("../../../../services/api/client");
http.defaults.adapter = adapter;
axios.defaults.adapter = adapter;

const { default: i18n } = await import("../../../../i18n");
const { resourceRequestsAPI } = await import("../../../../services/api/resourceRequests");
const { createRequestList } = await import("../pedidos/requestList");
const { RequestsPanel } = await import("../pedidos/RequestsPanel");
const { RequestButton } = await import("../pedidos/RequestButton");
const { requestAction } = await import("../../../../utils/requests");

class Tab extends EventTarget {
  visibilityState: DocumentVisibilityState = "visible";

  turn(state: DocumentVisibilityState) {
    this.visibilityState = state;
    this.dispatchEvent(new Event("visibilitychange"));
  }

  leaveAndComeBack() {
    this.turn("hidden");
    this.turn("visible");
  }
}

const settle = () => new Promise((done) => setTimeout(done, 0));

function hold(): () => void {
  let release = () => {};
  held = new Promise<void>((resolve) => {
    release = resolve;
  });
  return () => {
    held = null;
    release();
  };
}

function panelFor(cards: readonly RequestCard[]) {
  return renderToStaticMarkup(
    createElement(RequestsPanel, {
      cards,
      error: null,
      action: createElement(RequestButton, {
        action: requestAction(cards, "yes"),
        formAvailable: true,
        opening: false,
        onOpen: () => {},
        onRetry: () => {},
      }),
    }),
  );
}

let tab: Tab;
const list = () => createRequestList(resourceRequestsAPI, PROJECT);

beforeEach(async () => {
  await i18n.changeLanguage("pt");
  calls.length = 0;
  pages = [];
  held = null;
  refusing = false;
  tab = new Tab();
});

describe("o painel de pedidos relê a lista quando a aba volta a ficar visível (OBT-682)", () => {
  it("abrir a ficha lê os pedidos do projeto uma vez, mesmo com o efeito montado duas vezes", async () => {
    pages = [[SENT]];
    const requests = list();

    await Promise.all([requests.open(), requests.open()]);

    expect(calls).toEqual([`/resource-requests/projects/${PROJECT}/requests`]);
    expect(requests.get().cards?.map((card) => card.id)).toEqual(["r-1"]);
  });

  it("esconder a aba não pede nada; voltar a ela lê a lista de novo", async () => {
    const requests = list();
    requests.rereadOnReturn(tab);
    await requests.open();

    tab.turn("hidden");
    await settle();
    expect(calls).toHaveLength(1);

    tab.turn("visible");
    await settle();
    expect(calls).toHaveLength(2);
  });

  it("voltar à aba mostra a solicitação iniciada na outra aba: o cartão em preenchimento e o botão Continuar", async () => {
    pages = [[SENT], [STARTED, SENT]];
    const requests = list();
    requests.rereadOnReturn(tab);
    await requests.open();
    expect(panelFor(requests.get().cards!)).toContain(i18n.t("rr_start"));

    tab.leaveAndComeBack();
    await settle();

    const html = panelFor(requests.get().cards!);
    expect(html).toContain(i18n.t("rr_card_open"));
    expect(html).toContain(i18n.t("rr_continue"));
    expect(html).not.toContain(i18n.t("rr_start"));
  });

  it("voltar com uma leitura no ar não faz um segundo pedido enquanto ela não chega", async () => {
    const release = hold();
    const requests = list();
    requests.rereadOnReturn(tab);
    const opening = requests.open();

    tab.leaveAndComeBack();
    await settle();
    expect(calls).toHaveLength(1);

    release();
    await opening;
  });

  it("a resposta da leitura que começou antes da volta nunca aparece; a lista é lida mais uma vez", async () => {
    pages = [[SENT], [STARTED, SENT]];
    const release = hold();
    const requests = list();
    const shown: (readonly string[] | null)[] = [];
    requests.subscribe(() => shown.push(requests.get().cards?.map((card) => card.id) ?? null));
    requests.rereadOnReturn(tab);
    const opening = requests.open();

    tab.leaveAndComeBack();
    release();
    await opening;

    expect(calls).toHaveLength(2);
    expect(shown).not.toContainEqual(["r-1"]);
    expect(requests.get().cards?.map((card) => card.id)).toEqual(["r-2", "r-1"]);
  });

  it("várias voltas com a leitura no ar valem uma releitura só", async () => {
    const release = hold();
    const requests = list();
    requests.rereadOnReturn(tab);
    const opening = requests.open();

    tab.leaveAndComeBack();
    tab.leaveAndComeBack();
    tab.leaveAndComeBack();
    release();
    await opening;

    expect(calls).toHaveLength(2);
  });

  it("a releitura que falha mantém os cartões já lidos e não diz falha", async () => {
    pages = [[SENT]];
    const requests = list();
    await requests.open();

    refusing = true;
    await requests.read();

    expect(calls).toHaveLength(2);
    expect(requests.get().cards?.map((card) => card.id)).toEqual(["r-1"]);
    expect(requests.get().failure).toBeNull();
  });

  it("a falha da primeira leitura fala; voltar à aba lê de novo mostrando o carregando, não a falha", async () => {
    refusing = true;
    const requests = list();
    requests.rereadOnReturn(tab);
    await requests.open();
    expect(requests.get().failure?.kind).toBe("server");
    expect(requests.get().cards).toBeNull();

    refusing = false;
    pages = [[SENT]];
    const release = hold();
    tab.leaveAndComeBack();
    expect(requests.get()).toEqual({ cards: null, failure: null });

    release();
    await settle();
    expect(requests.get().cards?.map((card) => card.id)).toEqual(["r-1"]);
  });

  it("fechar a ficha deixa de ouvir a aba", async () => {
    const requests = list();
    const stop = requests.rereadOnReturn(tab);
    await requests.open();

    stop();
    tab.leaveAndComeBack();
    await settle();

    expect(calls).toHaveLength(1);
  });
});
