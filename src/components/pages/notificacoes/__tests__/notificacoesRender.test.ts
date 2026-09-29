import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import type {
  AppNotification,
  NotificationPrefs,
  NotificationPrefsHandlers,
} from "../../../../types/notification";
import type { Project } from "../../../../types/project";

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
const { NOTIF_DEFAULTS } = await import("../../../../constants/notifications");
const { makeProject } = await import("../../../../utils/__tests__/factory");
const { routedNotifications, visibleNotifications } = await import(
  "../../../../utils/notifications"
);
const { NotificationsPanelBody } = await import("../NotificationsPanel");

const NOW = new Date("2026-08-15T12:00:00");

const handlers: NotificationPrefsHandlers = {
  setEnabled: () => {},
  toggleChannel: () => {},
  setWhen: () => {},
  setScope: () => {},
  setEmailAddr: () => {},
  setPhoneAddr: () => {},
  toggleCustomProject: () => {},
};

const projects: Project[] = [
  makeProject({
    id: "shared",
    location: "Brazil",
    team: "JOCUM Belém",
    languageName: "Tikuna",
    prayerRequests: "Orem pelos anciãos que recebem o Evangelho.",
    prayerVisibility: "rede",
    healthAssessmentDate: "2026-08-10",
    healthEmotional: "critica",
  }),
  makeProject({
    id: "withheld",
    location: "Peru",
    languageName: "Quechua",
    sensitiveCountry: true,
    prayerRequests: "Pedido confiado só à coordenação.",
    healthAssessmentDate: "2026-08-11",
  }),
];

const view = (overrides: Partial<NotificationPrefs> = {}) => {
  const prefs: NotificationPrefs = { ...NOTIF_DEFAULTS, ...overrides };
  return renderToStaticMarkup(
    createElement(NotificationsPanelBody, {
      entries: visibleNotifications(
        routedNotifications(
          projects,
          { roles: ["globalStrategist"], regions: null },
          NOW,
        ),
        prefs,
        "Karina Marinho",
      ),
      projects,
      prefs,
      handlers,
    }),
  );
};

beforeEach(async () => {
  await i18n.changeLanguage("pt");
});

describe("NotificationsPanelBody", () => {
  it("renderiza o painel do protótipo: mestre, canais, quando, escopo e log", () => {
    const markup = view();

    expect(markup).toContain("Notificar a cada envio");
    expect(markup).toContain("Onde quero receber");
    expect(markup).toContain("Quando avisar");
    expect(markup).toContain("Quais projetos");
    expect(markup).toContain("Últimas notificações");
    expect(markup).toContain("Fresia enviou o pulso de maio");
  });

  it("o urgente se distingue no texto, não só na cor", () => {
    const markup = view();

    expect(markup).toContain("Urgente");
    expect(markup).toContain("Crítica");
  });

  it("um pedido não autorizado não aparece; o país sensível também não", () => {
    const markup = view();

    expect(markup).toContain("Orem pelos anciãos que recebem o Evangelho.");
    expect(markup).not.toContain("Pedido confiado só à coordenação.");
    expect(markup).not.toContain("Peru");
  });

  it("desativado, o log explica em vez de sumir", () => {
    const markup = view({ enabled: false });

    expect(markup).toContain("As notificações estão desativadas");
    expect(markup).not.toContain("Tikuna · JOCUM Belém");
  });

  it("a lista personalizada abre o seletor com contagem honesta", () => {
    const markup = view({ scope: "custom", customProjectIds: ["shared"] });

    expect(markup).toContain("Tikuna · JOCUM Belém");
    expect(markup).toContain("1 projeto escolhido");
    expect(markup).toContain("Quechua · —");
    expect(markup).not.toContain("Avaliação de saúde recebida");
  });

  it("carregando não é vazio: o log gira em vez de negar", () => {
    const markup = renderToStaticMarkup(
      createElement(NotificationsPanelBody, {
        entries: null,
        projects: [],
        prefs: { ...NOTIF_DEFAULTS },
        handlers,
      }),
    );

    expect(markup).toContain("Carregando");
    expect(markup).not.toContain("Nenhuma notificação");
  });

  const requests: AppNotification[] = [
    {
      kind: "requestDecision",
      id: "d1",
      urgent: false,
      audience: ["equipe"],
      projectId: "kadiweu",
      date: "2026-08-15",
      requestName: "Kadiwéu 2026",
      requestStage: "condicional",
    },
    {
      kind: "requestArrival",
      id: "a1",
      urgent: false,
      audience: ["gestor"],
      projectId: "tikuna",
      date: "2026-08-14",
      requestName: "  ",
      requestStage: "triagem",
    },
    {
      kind: "requestArrival",
      id: "a2",
      urgent: false,
      audience: ["gestor"],
      projectId: null,
      date: "2026-08-13",
      requestName: "Sem ponteiro",
      requestStage: "triagem",
    },
  ];

  const requestView = () =>
    renderToStaticMarkup(
      createElement(
        MemoryRouter,
        null,
        createElement(NotificationsPanelBody, {
          entries: requests,
          projects: [],
          prefs: { ...NOTIF_DEFAULTS },
          handlers,
        }),
      ),
    );

  it("os dois avisos de pedido mostram o nome registrado e a etapa, e cada um leva à ficha do projeto", () => {
    const markup = requestView();

    expect(markup).toContain("Kadiwéu 2026");
    expect(markup).toContain("Decisão da mesa · Aprovado com condições");
    expect(markup).toContain("Pedido de recurso recebido · em triagem");
    expect(markup).toContain('href="/ficha/kadiweu/identidade"');
    expect(markup).toContain('href="/ficha/tikuna/identidade"');
  });

  it("um aviso de pedido sem nome usa a referência genérica", () => {
    expect(requestView()).toContain(">Pedido de recurso<");
  });

  it("um aviso de pedido sem ponteiro não vira link, e nenhum mostra local nem base", () => {
    const markup = requestView();

    expect(markup).toContain("Sem ponteiro");
    expect(markup.match(/href=/g)).toHaveLength(2);
    expect(markup).not.toContain(" · —");
  });

  it("em inglês o aviso de pedido também sai em inglês", () => {
    return i18n.changeLanguage("en").then(() => {
      const markup = requestView();

      expect(markup).toContain("Board decision · Conditionally approved");
      expect(markup).toContain("Resource request received · in triage");
      expect(markup).not.toContain("Decisão da mesa");
    });
  });

  it("em inglês nada fica em português", () => {
    return i18n.changeLanguage("en").then(() => {
      const markup = view();

      expect(markup).toContain("Notify on every submission");
      expect(markup).not.toContain("Notificar a cada envio");
      expect(markup).not.toContain("Últimas notificações");
    });
  });
});
