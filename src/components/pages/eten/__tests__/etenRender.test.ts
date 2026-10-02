import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
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
const { buildEtenReport, reportYears, defaultReportYear } = await import(
  "../../../../utils/etenCredits"
);
const { formatDate } = await import("../../../../utils/format");

type Project = ReturnType<typeof createEmptyProject>;
type EtenYearReport = import("../../../../types/eten").EtenYearReport;
type EtenCreditEntry = import("../../../../types/eten").EtenCreditEntry;

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

const YEAR = 2026;

const render = (
  report: EtenYearReport | null,
  error: string | null = null,
) =>
  renderToStaticMarkup(
    createElement(EtenView, {
      year: YEAR,
      onYearChange: () => {},
      report,
      error,
      onRetry: () => {},
      now: NOW,
    }),
  );

const view = (projects: Project[] | null, ledger: EtenCreditEntry[] = []) =>
  render(projects === null ? null : buildEtenReport(projects, YEAR, ledger, NOW));

beforeEach(async () => {
  await i18n.changeLanguage("pt");
});

describe("o seletor abre no último ano fiscal fechado", () => {
  it("oferece quatro anos fiscais, do aberto para trás", () => {
    expect(reportYears(NOW)).toEqual([2027, 2026, 2025, 2024]);
  });

  it("em junho abre no ano que fechou no julho anterior", () => {
    expect(defaultReportYear(NOW)).toBe(2026);
  });

  /**
   * GATE-01 (OBT-387, 25/set/2026): o ano do ETEN é fiscal, de agosto a julho. Em setembro o
   * ano civil já é o mesmo do fiscal que acabou de abrir, e o padrão tem de ser o que fechou.
   */
  it("em setembro de 2026 abre no 2025/26, que fechou em 31/07/2026", () => {
    const september = new Date(2026, 8, 28);
    expect(defaultReportYear(september)).toBe(2026);
    expect(reportYears(september)[0]).toBe(2027);
  });

  it("cada ano diz os dois anos civis que cobre e o dia em que fecha", () => {
    expect(
      i18n.t("eten_fiscal_label", { span: "2025/26", end: formatDate("2026-07-31") }),
    ).toContain("2025/26");
  });

  it("o indicador de avanço nomeia o ano fiscal, não um ano civil solto", () => {
    const markup = view([
      listed({ progressHistory: [snapshot("2025-07-31", 10), snapshot("2026-07-31", 20)] }),
    ]);
    expect(markup).toContain(i18n.t("eten_advancing_sub"));
    expect(markup).toContain("2025/26");
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
        progressHistory: [snapshot("2025-07-31", 40), snapshot("2026-07-31", 40)],
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
          snapshot("2025-07-31", 200),
          snapshot("2026-07-31", 260),
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
          snapshot("2025-07-31", 24),
          snapshot("2026-07-31", 36),
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
    const markup = view([listed({ progressHistory: [snapshot("2026-07-31", 10)] })]);
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
        progressHistory: [snapshot("2026-07-31", 10)],
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
        progressHistory: [snapshot("2026-07-31", 10)],
      }),
    ]);
    expect(markup).toContain("Brazil");
  });
});

describe("uma queda aparece na tabela em vez de virar zero", () => {
  it("o recuo se lê com sinal", () => {
    const markup = view([
      listed({
        progressHistory: [snapshot("2025-07-31", 40), snapshot("2026-07-31", 28)],
      }),
    ]);
    expect(markup).toContain("−12");
    expect(markup).not.toContain("+0");
  });
});

describe("ano sem dado não se parece com ano de zero crédito", () => {
  it("sem dado, a tela diz isso em palavras e não mostra zero", () => {
    const markup = view([listed({ progressHistory: [] })]);

    expect(markup).toContain(i18n.t("eten_year_no_data", { year: "2025/26" }));
    expect(markup).toContain(i18n.t("eten_no_data"));
  });

  it("com dado, zero crédito é uma afirmação e o aviso some", () => {
    const markup = view([
      listed({
        progressHistory: [snapshot("2025-07-31", 40), snapshot("2026-07-31", 40)],
      }),
    ]);

    expect(markup).not.toContain(i18n.t("eten_year_no_data", { year: "2025/26" }));
    expect(markup).toContain("+0");
  });
});

describe("uma conclusão sem ano não vira crédito de um ano qualquer", () => {
  it("a linha diz que a conclusão não tem ano registrado", () => {
    const markup = view([
      listed({
        status: "concluido",
        progressHistory: [snapshot("2026-07-31", 100)],
      }),
    ]);

    expect(markup).toContain(i18n.t("eten_undated"));
  });
});

describe("a tela não promete o que a onda 1 não entrega", () => {
  /**
   * O GATE-01 fechou em 25/set/2026: a regra está confirmada e o escopo parcial vale zero. Os
   * dois avisos que diziam o contrário saíram da tela e dos catálogos.
   */
  it("não chama mais a regra de provisória, nem a sobra de escopo de indefinida", () => {
    for (const key of ["eten_rule_pending", "eten_carryover_open"]) {
      expect(i18n.exists(key, { lng: "pt" }), key).toBe(false);
      expect(i18n.exists(key, { lng: "en" }), key).toBe(false);
    }
  });

  it("diz na tela que o ano é fiscal e que cada parceiro recebe o crédito inteiro", () => {
    expect(view([])).toContain(i18n.t("eten_footnote"));
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

describe("a tela mostra o relatório que recebeu, e não calcula nenhum número", () => {
  const SCREEN_DIR = join(process.cwd(), "src", "components", "pages", "eten");
  const screen = readdirSync(SCREEN_DIR)
    .filter((name) => /\.tsx?$/u.test(name))
    .map((name) => [name, readFileSync(join(SCREEN_DIR, name), "utf8")] as const);

  it("nenhum arquivo da tela importa a regra do crédito", () => {
    expect(screen.map(([name]) => name)).toContain("index.tsx");
    expect(screen.map(([name]) => name)).toContain("CreditTable.tsx");
    for (const [path, source] of screen) {
      expect(source, path).not.toMatch(/\b(buildEtenReport|accountFor|readingAtYearEnd)\b/u);
    }
  });

  /** O relatório como o `GET /eten/report` do BE-11 responde — nenhum projeto por trás. */
  const fromServer: EtenYearReport = {
    year: YEAR,
    listedProjects: 2,
    advancingProjects: 1,
    totalCredits: 1,
    hasData: true,
    periodStart: "2025-08-01",
    periodEnd: "2026-07-31",
    asOf: "2026-09-29",
    reportId: "b3f1c0de-0000-4000-8000-000000000413",
    recordedAt: "2026-09-29T14:02:11Z",
    snapshots: [
      {
        projectId: "sigilosa-cairo",
        languageName: "Sigilosa",
        country: { withheld: true, regionLabelKey: "continent_africa" },
        scopeUnits: 25,
        approvedAtStart: 20,
        approvedAtEnd: 25,
        advanced: 5,
        concluded: true,
        completedInYear: true,
        undatedCompletion: false,
        hasData: true,
        credits: 1,
        creditsSource: "calculated",
        startReading: {
          source: "history",
          approvedUnits: 20,
          totalUnits: 25,
          entryId: "e-1",
          date: "2025-07-20",
        },
        endReading: {
          source: "history",
          approvedUnits: 25,
          totalUnits: 25,
          entryId: "e-2",
          date: "2026-03-10",
        },
        completedDate: "2026-03-10",
        completionSource: "completedDate",
        approvedUnverified: false,
        manualEntry: null,
      },
      {
        projectId: "kadiweu-mato-grosso",
        languageName: "Kadiwéu",
        country: { withheld: false, location: "Brazil" },
        scopeUnits: 260,
        approvedAtStart: 40,
        approvedAtEnd: 40,
        advanced: 0,
        concluded: false,
        completedInYear: false,
        undatedCompletion: false,
        hasData: true,
        credits: 0,
        creditsSource: "calculated",
        startReading: null,
        endReading: {
          source: "live",
          approvedUnits: 40,
          totalUnits: 260,
          entryId: null,
          date: null,
        },
        completedDate: null,
        completionSource: "snapshots",
        approvedUnverified: true,
        manualEntry: null,
      },
    ],
  };

  it("mostra a data em que o servidor registrou o relatório e qual registro é", () => {
    const markup = render(fromServer);
    expect(markup).toContain(
      i18n.t("eten_recorded_on", { date: formatDate("2026-09-29") }),
    );
    expect(markup).toContain(fromServer.reportId);
    expect(markup).not.toContain(i18n.t("eten_not_recorded"));
  });

  it("diz o período fiscal e o corte em 31 de julho", () => {
    const markup = render(fromServer);
    expect(markup).toContain(
      i18n.t("eten_period", {
        start: formatDate("2025-08-01"),
        end: formatDate("2026-07-31"),
      }),
    );
    expect(markup).toContain(
      i18n.t("eten_computed_for", { date: formatDate("2026-09-29") }),
    );
  });

  it("um cálculo que ninguém registrou diz isso, em vez de inventar um registro", () => {
    const markup = view([listed({ progressHistory: [snapshot("2026-07-31", 10)] })]);
    expect(markup).toContain(i18n.t("eten_not_recorded"));
    expect(markup).not.toContain(i18n.t("eten_report_ref"));
  });

  it("o detalhamento leva do total ao projeto e ao registro que o produziu", () => {
    const markup = render(fromServer);
    expect(markup).toContain(i18n.t("eten_breakdown_title"));
    expect(markup).toContain(
      i18n.t("eten_why_completed", { scope: 25, date: formatDate("2026-03-10") }),
    );
    expect(markup).toContain(i18n.t("eten_breakdown_credits", { count: 1 }));
  });

  it("só quem ganhou crédito entra no detalhamento; a tabela continua com todos", () => {
    const markup = render(fromServer);
    const breakdown = markup.slice(markup.indexOf(i18n.t("eten_breakdown_title")));
    expect(breakdown).toContain("Sigilosa");
    expect(breakdown).not.toContain("Kadiwéu");
    expect(markup).toContain("Kadiwéu");
  });

  it("cada leitura da tabela diz de que registro veio", () => {
    const markup = render(fromServer);
    expect(markup).toContain(
      i18n.t("eten_reading_on", { date: formatDate("2026-03-10") }),
    );
    expect(markup).toContain(i18n.t("eten_reading_live"));
  });

  it("a contagem vinda da importação vem marcada", () => {
    expect(render(fromServer)).toContain(i18n.t("eten_unverified"));
  });

  it("o país sensível sai como a região que o servidor mandou, em todo lugar da tela", () => {
    const markup = render(fromServer);
    expect(markup).toContain(i18n.t("continent_africa"));
    expect(markup).not.toContain("Egypt");
    expect(markup).not.toContain("Cairo");
  });

  it("o crédito à mão diz quem o informou e quando", () => {
    const markup = view(
      [
        listed({
          progressHistory: [snapshot("2025-07-31", 40), snapshot("2026-07-31", 60)],
        }),
      ],
      [
        {
          projectId: "kadiweu",
          year: YEAR,
          credits: 1,
          source: "manual",
          recordedBy: "Maria Lima",
          recordedAt: "2026-08-03T10:00:00Z",
        },
      ],
    );
    expect(markup).toContain(
      i18n.t("eten_manual_by", { name: "Maria Lima", date: formatDate("2026-08-03") }),
    );
  });

  it("uma falha diz o que aconteceu e oferece tentar de novo, sem número nenhum", () => {
    const markup = render(null, "Sem conexão com o servidor.");
    expect(markup).toContain("Sem conexão com o servidor.");
    expect(markup).toContain(i18n.t("net_retry"));
    expect(markup).not.toContain(i18n.t("eten_total_credits"));
    expect(markup).not.toContain(i18n.t("loading"));
  });
});

describe("o nome retido de um projeto sensível (OBT-562)", () => {
  it("uma chave de região no lugar do nome vira frase, e nunca aparece crua", () => {
    const sensitive = {
      ...createEmptyProject("sensivel"),
      inETEN: true,
      location: "Egypt",
      sensitiveCountry: true,
      languageName: "africa",
      languageNameWithheld: true,
    };

    const markup = view([sensitive]);

    expect(markup).toContain(
      i18n.t("sensitive_project_named", { region: i18n.t("continent_africa") }),
    );
    expect(markup).not.toContain(">africa<");
  });
});
