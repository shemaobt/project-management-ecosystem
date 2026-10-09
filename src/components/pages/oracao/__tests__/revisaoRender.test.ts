import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PrayerReviewEntry } from "../../../../types/prayer";

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
const { MemoryRouter } = await import("react-router-dom");
const { RevisaoView } = await import("../RevisaoPage");
const { SubNav } = await import("../SubNav");
type QueueLoad = import("../RevisaoPage").QueueLoad;

const WAITING: PrayerReviewEntry[] = [
  {
    id: "garoa-pr",
    projectId: "garoa",
    needId: null,
    language: "Língua Garoa",
    source: "Formulário",
    text: "Orem pelo líder preso na cidade.",
  },
  {
    id: "garoa-need-7",
    projectId: "garoa",
    needId: "7",
    language: "Língua Garoa",
    source: "Necessidade",
    text: "Orem pelo dinheiro do barco.",
  },
];

const view = (queue: QueueLoad) =>
  renderToStaticMarkup(
    createElement(
      MemoryRouter,
      { initialEntries: ["/oracao/revisao"] },
      createElement(RevisaoView, { queue, onRelease: () => Promise.resolve() }),
    ),
  );

beforeEach(async () => {
  await i18n.changeLanguage("pt");
});

describe("a fila de revisão (OBT-575)", () => {
  it("mostra cada pedido com o texto da equipe num campo que a coordenação edita, e o botão de liberar", () => {
    const html = view({ status: "ready", entries: WAITING });

    expect(html).toContain("Pedidos para revisar");
    expect(html).toContain("Orem pelo líder preso na cidade.</textarea>");
    expect(html).toContain("Orem pelo dinheiro do barco.</textarea>");
    expect(html.match(/Liberar para o mural/g)).toHaveLength(2);
    expect(html).toContain("Formulário");
    expect(html).toContain("Necessidade");
  });

  it("cada campo tem o seu rótulo", () => {
    const html = view({ status: "ready", entries: WAITING });

    expect(html).toContain('for="revisao-garoa-pr"');
    expect(html).toContain('id="revisao-garoa-pr"');
    expect(html).toContain('for="revisao-garoa-need-7"');
  });

  it("sem nada esperando, diz que não há pedido", () => {
    expect(view({ status: "ready", entries: [] })).toContain(
      "Nenhum pedido aguardando revisão.",
    );
  });
});

describe("a aba de revisão", () => {
  const nav = (reviews: boolean) =>
    renderToStaticMarkup(
      createElement(
        MemoryRouter,
        { initialEntries: ["/oracao"] },
        createElement(SubNav, { reviews }),
      ),
    );

  it("só aparece para quem revisa", () => {
    expect(nav(true)).toContain('href="/oracao/revisao"');
    expect(nav(false)).not.toContain("/oracao/revisao");
  });
});
