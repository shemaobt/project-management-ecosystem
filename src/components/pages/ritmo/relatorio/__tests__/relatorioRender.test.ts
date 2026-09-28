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

const { default: i18n } = await import("../../../../../i18n");
const { createEmptyProject } = await import("../../../../../fixtures/blank");
const { RelatorioView } = await import("../RelatorioPage");

type Project = ReturnType<typeof createEmptyProject>;

const NOW = new Date(2026, 8, 28);

const view = (projects: Project[] | null, year = 2025) =>
  renderToStaticMarkup(
    createElement(RelatorioView, { projects, year, onYearChange: () => {}, now: NOW }),
  );

beforeEach(async () => {
  await i18n.changeLanguage("pt");
});

describe("o relatório anual da Celebração", () => {
  it("mostra iniciados e finalizados, com a lista por região", () => {
    const markup = view([
      { ...createEmptyProject("a"), languageName: "Kadiwéu", location: "Brazil", startDate: "2025-03-10" },
    ]);

    expect(markup).toContain(i18n.t("relatorio_started"));
    expect(markup).toContain(i18n.t("relatorio_finished"));
    expect(markup).toContain("Kadiwéu");
    expect(markup).toContain(i18n.t("continent_south_america"));
  });

  it("sem dado, diz que não tem dado em vez de mostrar zero", () => {
    const markup = view([{ ...createEmptyProject("a"), location: "Brazil" }]);

    expect(markup).toContain(i18n.t("relatorio_no_data", { year: 2025 }));
    expect(markup).not.toContain(">0<");
  });

  it("diz quantos concluídos ficaram fora por não terem data", () => {
    const markup = view([
      { ...createEmptyProject("a"), location: "Brazil", status: "concluido", startDate: "2024-01-01" },
    ]);

    expect(markup).toContain(i18n.t("relatorio_undated", { count: 1 }));
  });

  it("um projeto sensível aparece com a região, sem país nem base", () => {
    const markup = view([
      {
        ...createEmptyProject("s"),
        languageName: "Sigilosa",
        location: "Egypt, Cairo",
        team: "YWAM Egypt",
        sensitiveCountry: true,
        startDate: "2025-04-01",
      },
    ]);

    expect(markup).toContain("Sigilosa");
    expect(markup).toContain(i18n.t("continent_africa"));
    expect(markup).not.toContain("Egypt");
    expect(markup).not.toContain("Cairo");
  });

  /** Não há modelo de meta; uma seção sem nada por trás seria a superfície inventada. */
  it("não tem seção de metas, e diz que o ano é o civil", () => {
    const markup = view([]);

    expect(markup).toContain(i18n.t("relatorio_calendar_note"));
    expect(markup.toLowerCase()).not.toContain("metas atingidas</");
  });

  it("enquanto carrega, não afirma nada", () => {
    const markup = view(null);

    expect(markup).toContain(i18n.t("loading"));
    expect(markup).not.toContain(i18n.t("relatorio_no_data", { year: 2025 }));
  });
});
