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
const { EtenView } = await import("..");
const { reportYears, defaultReportYear } = await import(
  "../../../../utils/etenCredits"
);

type Project = ReturnType<typeof createEmptyProject>;

const NOW = new Date(2027, 5, 14);

const listed = (over: Partial<Project> = {}): Project => ({
  ...createEmptyProject("kadiweu"),
  languageName: "Kadiwéu",
  location: "Brazil",
  inETEN: true,
  totalUnits: 260,
  ...over,
});

const snapshot = (date: string, approvedUnits: number) => ({
  date,
  translatedUnits: approvedUnits,
  communityCheckedUnits: approvedUnits,
  approvedUnits,
});

const view = (projects: Project[] | null) =>
  renderToStaticMarkup(
    createElement(EtenView, { projects, ledger: [], now: NOW }),
  );

beforeEach(async () => {
  await i18n.changeLanguage("pt");
});

describe("o seletor de ano abre no último ano fechado", () => {
  it("oferece quatro anos, do corrente para trás", () => {
    expect(reportYears(NOW)).toEqual([2027, 2026, 2025, 2024]);
  });

  it("abre no ano anterior, que é o único já fechado", () => {
    expect(defaultReportYear(NOW)).toBe(2026);
  });

  it("o rótulo do seletor aparece na tela", () => {
    expect(view([])).toContain(i18n.t("eten_report_year"));
  });
});

describe("só projeto listado no ETEN entra na conta", () => {
  it("um projeto fora da lista nunca aparece", () => {
    const markup = view([
      listed({ id: "dentro", languageName: "Kadiwéu" }),
      {
        ...createEmptyProject("fora"),
        languageName: "Fataluku",
        inETEN: false,
      },
    ]);

    expect(markup).toContain("Kadiwéu");
    expect(markup).not.toContain("Fataluku");
  });

  it("sem nenhum listado, a tela explica como listar", () => {
    const markup = view([
      { ...createEmptyProject("fora"), inETEN: false },
    ]);
    expect(markup).toContain(i18n.t("eten_empty").split(".")[0]);
  });
});

describe("um projeto listado sem crédito continua na tabela", () => {
  it("aparece com zero, em vez de sumir do relatório", () => {
    const markup = view([
      listed({
        id: "parado",
        languageName: "Kadiwéu",
        progressHistory: [snapshot("2025-12-31", 40), snapshot("2026-12-31", 40)],
      }),
    ]);

    expect(markup).toContain("Kadiwéu");
    expect(markup).toContain("+0");
  });

  it("a soma do rodapé conta o que a tabela mostra", () => {
    const markup = view([
      listed({
        id: "concluiu",
        languageName: "Kadiwéu",
        progressHistory: [
          snapshot("2025-12-31", 200),
          snapshot("2026-12-31", 260),
        ],
      }),
    ]);

    expect(markup).toContain(i18n.t("eten_total"));
    expect(markup).toContain("+60");
  });
});

describe("a subtração aparece, não só o resultado", () => {
  it("cada linha mostra início, fim e o avanço", () => {
    const markup = view([
      listed({
        id: "kadiweu",
        progressHistory: [
          snapshot("2025-12-31", 24),
          snapshot("2026-12-31", 36),
        ],
      }),
    ]);

    expect(markup).toContain(i18n.t("eten_col_start"));
    expect(markup).toContain(i18n.t("eten_col_end"));
    expect(markup).toContain(i18n.t("eten_col_advanced"));
    expect(markup).toContain(">24<");
    expect(markup).toContain(">36<");
    expect(markup).toContain("+12");
  });

  it("a coluna de escopo diz contra o que o avanço é medido", () => {
    const markup = view([listed({ progressHistory: [snapshot("2026-12-31", 10)] })]);
    expect(markup).toContain(i18n.t("eten_col_scope"));
    expect(markup).toContain(">260<");
  });
});

describe("a tabela do ETEN é caminho de saída, e o §6.1 vale aqui", () => {
  it("um país sensível não imprime o país verdadeiro na tabela", () => {
    const markup = view([
      listed({
        id: "sensivel",
        languageName: "Sigilosa",
        location: "Egypt, Cairo",
        sensitiveCountry: true,
        progressHistory: [snapshot("2026-12-31", 10)],
      }),
    ]);

    expect(markup).toContain("Sigilosa");
    expect(markup).not.toContain("Egypt");
    expect(markup).not.toContain("Cairo");
    expect(markup).toContain(i18n.t("continent_africa"));
  });

  it("um país não sensível continua aparecendo", () => {
    const markup = view([
      listed({
        location: "Brazil, Cuiabá",
        progressHistory: [snapshot("2026-12-31", 10)],
      }),
    ]);
    expect(markup).toContain("Brazil");
  });
});

describe("uma queda aparece na tabela em vez de virar zero", () => {
  it("o recuo se lê com sinal", () => {
    const markup = view([
      listed({
        progressHistory: [snapshot("2025-12-31", 40), snapshot("2026-12-31", 28)],
      }),
    ]);
    expect(markup).toContain("−12");
    expect(markup).not.toContain("+0");
  });
});

describe("ano sem dado não se parece com ano de zero crédito", () => {
  it("sem dado, a tela diz isso em palavras e não mostra zero", () => {
    const markup = view([listed({ progressHistory: [] })]);

    expect(markup).toContain(i18n.t("eten_year_no_data", { year: 2026 }));
    expect(markup).toContain(i18n.t("eten_no_data"));
  });

  it("com dado, zero crédito é uma afirmação e o aviso some", () => {
    const markup = view([
      listed({
        progressHistory: [snapshot("2025-12-31", 40), snapshot("2026-12-31", 40)],
      }),
    ]);

    expect(markup).not.toContain(i18n.t("eten_year_no_data", { year: 2026 }));
    expect(markup).toContain("+0");
  });
});

describe("uma conclusão sem ano não vira crédito de um ano qualquer", () => {
  it("a linha diz que a conclusão não tem ano registrado", () => {
    const markup = view([
      listed({
        status: "concluido",
        progressHistory: [snapshot("2026-12-31", 100)],
      }),
    ]);

    expect(markup).toContain(i18n.t("eten_undated"));
  });
});

describe("a tela não promete o que a onda 1 não entrega", () => {
  it("diz que a regra ainda não foi confirmada com a Youngshin", () => {
    expect(view([])).toContain(i18n.t("eten_rule_pending"));
  });

  it("diz que a sobra de escopo parcial segue indefinida", () => {
    expect(view([])).toContain(i18n.t("eten_carryover_open"));
  });

  it("diz que CSV e PDF chegam na onda 2, em vez de mostrar botões mortos", () => {
    const markup = view([]);
    expect(markup).toContain(i18n.t("eten_export_pending"));
    expect(markup).not.toContain(i18n.t("eten_export_csv"));
    expect(markup).not.toContain(i18n.t("eten_gen_report"));
  });

  it("enquanto carrega, não afirma que não há projeto listado", () => {
    const markup = view(null);
    expect(markup).not.toContain(i18n.t("eten_empty"));
    expect(markup).toContain(i18n.t("loading"));
  });
});
