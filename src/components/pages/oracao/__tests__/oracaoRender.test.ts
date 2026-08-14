import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
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
const { MemoryRouter } = await import("react-router-dom");
const { makeProject } = await import("../../../../utils/__tests__/factory");
const { OracaoView } = await import("..");
const { ALL_CONTINENTS } = await import("../ContinentFilter");
type ContinentFilterValue = import("../ContinentFilter").ContinentFilterValue;

const view = (
  projects: readonly Project[] | null,
  initialContinent: ContinentFilterValue = ALL_CONTINENTS,
) =>
  renderToStaticMarkup(
    createElement(
      MemoryRouter,
      { initialEntries: ["/oracao"] },
      createElement(OracaoView, { projects, initialContinent }),
    ),
  );

const brazil = makeProject({
  id: "brazil",
  location: "Brazil",
  team: "JOCUM Belém",
  languageName: "Tikuna",
  prayerRequests: "Orem pelos anciãos que recebem o Evangelho.",
  prayerVisibility: "rede",
  healthAssessmentDate: "2026-05-14",
});

const asia = makeProject({
  id: "asia",
  location: "Indonesia",
  team: "YWAM Kupang",
  languageName: "Waima’a",
  prayerRequests: "Orem pela gravação que começa este mês.",
  prayerVisibility: "rede",
  healthAssessmentDate: "2026-04-02",
});

beforeEach(async () => {
  await i18n.changeLanguage("pt");
});

describe("OracaoView", () => {
  it("um pedido não autorizado não aparece em lugar nenhum do mural", () => {
    const withheld = makeProject({
      id: "withheld",
      location: "Peru",
      prayerRequests: "Pedido confiado só à coordenação.",
    });

    const markup = view([brazil, withheld]);

    expect(markup).toContain("Orem pelos anciãos que recebem o Evangelho.");
    expect(markup).not.toContain("Pedido confiado só à coordenação.");
  });

  it("agrupa por região e mostra língua, base, origem e data", () => {
    const markup = view([brazil, asia]);

    expect(markup).toContain('role="radiogroup"');
    expect(markup).toContain("América do Sul");
    expect(markup).toContain("Ásia");
    expect(markup).toContain("Tikuna");
    expect(markup).toContain("JOCUM Belém");
    expect(markup).toContain("Formulário");
    expect(markup).toContain("2026");
  });

  it("o filtro por continente combina com o agrupamento", () => {
    const markup = view([brazil, asia], "asia");

    expect(markup).toContain("Orem pela gravação que começa este mês.");
    expect(markup).not.toContain(
      "Orem pelos anciãos que recebem o Evangelho.",
    );
  });

  it("a origem do pedido fala a língua do catálogo", async () => {
    await i18n.changeLanguage("en");

    const markup = view([brazil]);

    expect(markup).toContain("Form");
    expect(markup).not.toContain("Formulário");
  });

  it("a respondida segue no mural, celebrada e legível sem cor", () => {
    const answered = makeProject({
      id: "answered",
      location: "Peru",
      languageName: "Asháninka",
      needsItems: [
        {
          category: "equipment",
          urgency: "high",
          status: "fulfilled",
          description: "Agradecemos: o gravador chegou.",
          prayerShared: true,
          prayerAnswered: true,
        },
      ],
    });

    const markup = view([answered]);

    expect(markup).toContain("Agradecemos: o gravador chegou.");
    expect(markup).toContain("Respondida ·");
    expect(markup).toMatch(/aria-hidden="true">✓/u);
  });

  it("uma seleção de continente que ficou órfã cai em Todas", () => {
    const markup = view([brazil], "asia");

    expect(markup).toContain("Orem pelos anciãos que recebem o Evangelho.");
    expect(markup).not.toContain("Nenhum pedido de oração ainda.");
  });

  it("um pedido gravado em áudio toca no mural", () => {
    const recorded = makeProject({
      id: "recorded",
      location: "Brazil",
      prayerRequests: "",
      prayerRequestsAudio: "data:audio/webm;base64,UklGRg==",
      prayerVisibility: "rede",
    });

    const markup = view([recorded]);

    expect(markup).toContain("<audio");
    expect(markup).toContain('aria-label="Pedido gravado em áudio"');
    expect(markup).toContain("data:audio/webm;base64,UklGRg==");
  });

  it("país sensível: o cartão mostra a região, nunca o país", () => {
    const sensitive = makeProject({
      id: "sensitive",
      location: "Peru",
      team: "",
      ywamBase: "",
      languageName: "Yine",
      prayerRequests: "Orem por proteção nas viagens.",
      prayerVisibility: "rede",
      sensitiveCountry: true,
    });

    const markup = view([sensitive]);

    expect(markup).not.toContain("Peru");
    expect(markup).toContain("América do Sul");
  });

  it("o mural vazio é uma boa notícia, não um painel em branco", () => {
    const markup = view([]);

    expect(markup).toContain("Nenhum pedido de oração ainda.");
    expect(markup).toContain("Pedidos reunidos");
  });

  it("enquanto hidrata, nada de boa notícia falsa", () => {
    const markup = view(null);

    expect(markup).not.toContain("Nenhum pedido de oração ainda.");
    expect(markup).not.toContain('role="radiogroup"');
    expect(markup).not.toContain("Todas");
    expect(markup).toContain("Pedidos reunidos");
  });
});
