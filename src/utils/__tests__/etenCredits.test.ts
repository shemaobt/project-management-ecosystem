import { afterAll, describe, expect, it } from "vitest";
import type { EtenCreditEntry } from "../../types/eten";
import type { ProgressHistoryEntry, ProjectStatus } from "../../types/project";
import {
  accountFor,
  approvedAtYearEnd,
  fiscalYearEnd,
  fiscalYearOf,
  fiscalYearSpan,
  type CountedProject,
} from "../etenCredits";
import { parseIsoDate, type CalendarDate } from "../cadence";

const originalTz = process.env.TZ;
process.env.TZ = "America/Sao_Paulo";

afterAll(() => {
  process.env.TZ = originalTz;
});

const NOW = new Date(2027, 5, 14);

const snapshot = (
  date: string,
  approvedUnits: number,
): ProgressHistoryEntry => ({
  date,
  translatedUnits: approvedUnits * 2,
  communityCheckedUnits: approvedUnits + 1,
  approvedUnits,
});

const project = (
  history: ProgressHistoryEntry[],
  extra: Partial<CountedProject> = {},
): CountedProject => ({
  id: "kadiweu",
  status: "em-andamento" as ProjectStatus,
  totalUnits: 260,
  approvedUnits: 0,
  progressHistory: history,
  ...extra,
});

const on = (iso: string): CalendarDate => {
  const parsed = parseIsoDate(iso);
  if (!parsed) throw new Error(iso);
  return parsed;
};

/**
 * GATE-01 (OBT-387, 25/set/2026): o ano do ETEN é fiscal, de 1º de agosto a 31 de julho, e
 * `year` é o ano que termina em 31/07/`year`. A fronteira é comparada por campo — o fuso de
 * quem abre a tela é o de São Paulo neste arquivo, e nada pode mudar de ano por causa dele.
 */
describe("o ano fiscal fecha em 31 de julho, lido por campo", () => {
  it("31 de julho é o último dia do ano que termina ali", () => {
    expect(fiscalYearOf(on("2026-07-31"))).toBe(2026);
  });

  it("1º de agosto já é o ano seguinte", () => {
    expect(fiscalYearOf(on("2026-08-01"))).toBe(2027);
  });

  it("janeiro pertence ao ano fiscal que fecha no julho seguinte", () => {
    expect(fiscalYearOf(on("2026-01-15"))).toBe(2026);
    expect(fiscalYearOf(on("2025-12-31"))).toBe(2026);
  });

  it("o ano se escreve pelos dois anos civis que cobre, e fecha no dia certo", () => {
    expect(fiscalYearSpan(2026)).toBe("2025/26");
    expect(fiscalYearSpan(2000)).toBe("1999/00");
    expect(fiscalYearEnd(2026)).toBe("2026-07-31");
  });
});

describe("a leitura de fim de ano corta em 31 de julho", () => {
  it("uma entrada de 1º de agosto não conta para o ano que fechou em 31/07", () => {
    const entries = [snapshot("2026-07-31", 10), snapshot("2026-08-01", 99)];

    expect(approvedAtYearEnd(project(entries), 2026, NOW)).toBe(10);
    expect(approvedAtYearEnd(project(entries), 2027, NOW)).toBe(99);
  });

  it("31 de julho conta para o próprio ano", () => {
    const entries = [snapshot("2026-07-31", 40)];
    expect(approvedAtYearEnd(project(entries), 2026, NOW)).toBe(40);
    expect(approvedAtYearEnd(project(entries), 2025, NOW)).toBeNull();
  });

  it("lê o retrato mais recente até o corte, não o último da lista", () => {
    const entries = [snapshot("2026-06-02", 30), snapshot("2025-09-01", 8)];
    expect(approvedAtYearEnd(project(entries), 2026, NOW)).toBe(30);
  });

  it("uma data ilegível não entra na conta", () => {
    const entries = [snapshot("30/06/2026", 99), snapshot("2026-06-30", 10)];
    expect(approvedAtYearEnd(project(entries), 2026, NOW)).toBe(10);
  });

  it("um escopo fechado em janeiro credita no fiscal daquele janeiro, e não no seguinte", () => {
    const entries = [snapshot("2025-07-31", 200), snapshot("2026-01-15", 260)];

    expect(accountFor(project(entries), 2026, [], NOW).credits).toBe(1);
    expect(accountFor(project(entries), 2027, [], NOW).credits).toBe(0);
  });

  it("fechar em 1º de agosto credita no ano que abre ali", () => {
    const entries = [snapshot("2026-07-31", 250), snapshot("2026-08-01", 260)];

    expect(accountFor(project(entries), 2026, [], NOW).credits).toBe(0);
    expect(accountFor(project(entries), 2027, [], NOW).credits).toBe(1);
  });
});

describe("uma queda é anunciada, nunca silenciosa", () => {
  it("aprovados que recuaram dão avanço negativo, não zero", () => {
    const entries = [snapshot("2025-07-31", 40), snapshot("2026-07-31", 28)];
    const account = accountFor(project(entries), 2026, [], NOW);

    expect(account.advanced).toBe(-12);
  });

  it("recuar não se confunde com ficar parado", () => {
    const parado = accountFor(
      project([snapshot("2025-07-31", 40), snapshot("2026-07-31", 40)]),
      2026,
      [],
      NOW,
    );
    const recuou = accountFor(
      project([snapshot("2025-07-31", 40), snapshot("2026-07-31", 28)]),
      2026,
      [],
      NOW,
    );

    expect(parado.advanced).toBe(0);
    expect(recuou.advanced).toBeLessThan(parado.advanced);
  });
});

describe("a unidade é capítulo aprovado, não traduzido", () => {
  it("ignora traduzidos e checados", () => {
    const entries = [snapshot("2026-07-31", 12)];
    const account = accountFor(project(entries), 2026, [], NOW);

    expect(account.approvedAtEnd).toBe(12);
    expect(entries[0].translatedUnits).toBe(24);
    expect(entries[0].communityCheckedUnits).toBe(13);
  });

  it("a subtração visível é fim menos início, em aprovados", () => {
    const entries = [snapshot("2025-07-31", 12), snapshot("2026-07-31", 40)];
    const account = accountFor(project(entries), 2026, [], NOW);

    expect(account.approvedAtStart).toBe(12);
    expect(account.approvedAtEnd).toBe(40);
    expect(account.advanced).toBe(28);
  });
});

describe("um crédito é um escopo definido concluído", () => {
  it("fechar o escopo no ano vale 1 crédito", () => {
    const entries = [snapshot("2025-07-31", 240), snapshot("2026-07-31", 260)];
    const account = accountFor(project(entries), 2026, [], NOW);

    expect(account.completedInYear).toBe(true);
    expect(account.credits).toBe(1);
    expect(account.creditsSource).toBe("calculated");
  });

  it("um escopo de 25 capítulos vale o mesmo 1 crédito que o Novo Testamento", () => {
    const small = accountFor(
      project([snapshot("2025-07-31", 0), snapshot("2026-07-31", 25)], {
        totalUnits: 25,
      }),
      2026,
      [],
      NOW,
    );
    const nt = accountFor(
      project([snapshot("2025-07-31", 0), snapshot("2026-07-31", 260)]),
      2026,
      [],
      NOW,
    );

    expect(small.credits).toBe(1);
    expect(nt.credits).toBe(1);
    expect(nt.advanced).toBe(260);
  });

  it("o escopo fechado num ano anterior não credita de novo", () => {
    const entries = [snapshot("2025-07-31", 260), snapshot("2026-07-31", 260)];
    const account = accountFor(project(entries), 2026, [], NOW);

    expect(account.completedInYear).toBe(false);
    expect(account.credits).toBe(0);
  });

  it("progresso parcial não vale crédito — só conta quando o escopo fecha", () => {
    const entries = [snapshot("2025-07-31", 0), snapshot("2026-07-31", 240)];
    const account = accountFor(project(entries), 2026, [], NOW);

    expect(account.advanced).toBe(240);
    expect(account.credits).toBe(0);
    expect(account.completedInYear).toBe(false);
  });

  it("um projeto sem escopo declarado não fecha escopo nenhum", () => {
    const account = accountFor(
      project([snapshot("2026-07-31", 40)], { totalUnits: 0 }),
      2026,
      [],
      NOW,
    );
    expect(account.completedInYear).toBe(false);
    expect(account.credits).toBe(0);
  });
});

describe("concluído sem data não vira crédito de um ano qualquer", () => {
  it("status concluído que os retratos não confirmam fica sem ano", () => {
    const account = accountFor(
      project([snapshot("2026-07-31", 100)], { status: "concluido" }),
      2026,
      [],
      NOW,
    );

    expect(account.concluded).toBe(true);
    expect(account.undatedCompletion).toBe(true);
    expect(account.credits).toBeNull();
    expect(account.creditsSource).toBeNull();
  });

  it("status concluído que os retratos confirmam credita no ano certo", () => {
    const entries = [snapshot("2025-07-31", 200), snapshot("2026-07-31", 260)];
    const account = accountFor(
      project(entries, { status: "concluido" }),
      2026,
      [],
      NOW,
    );

    expect(account.undatedCompletion).toBe(false);
    expect(account.credits).toBe(1);
  });
});

describe("ano sem dado não é ano de zero crédito", () => {
  it("sem retrato e ano no passado, não há leitura", () => {
    const account = accountFor(project([]), 2024, [], NOW);

    expect(account.hasData).toBe(false);
    expect(account.credits).toBeNull();
  });

  it("com retrato, zero crédito é uma afirmação", () => {
    const account = accountFor(
      project([snapshot("2026-07-31", 10)]),
      2026,
      [],
      NOW,
    );

    expect(account.hasData).toBe(true);
    expect(account.credits).toBe(0);
  });

  it("o ano corrente lê o valor vivo do projeto quando não há retrato", () => {
    const account = accountFor(
      project([], { approvedUnits: 7 }),
      NOW.getFullYear(),
      [],
      NOW,
    );

    expect(account.hasData).toBe(true);
    expect(account.approvedAtEnd).toBe(7);
  });
});

describe("um crédito informado à mão manda no calculado", () => {
  const ledger: EtenCreditEntry[] = [
    { projectId: "kadiweu", year: 2026, credits: 9, source: "manual" },
  ];

  it("sobrepõe o cálculo e diz de onde veio", () => {
    const entries = [snapshot("2025-07-31", 240), snapshot("2026-07-31", 260)];
    const account = accountFor(project(entries), 2026, ledger, NOW);

    expect(account.credits).toBe(9);
    expect(account.creditsSource).toBe("manual");
  });

  it("resgata o crédito de uma conclusão que os retratos não datam", () => {
    const account = accountFor(
      project([snapshot("2026-07-31", 100)], { status: "concluido" }),
      2026,
      ledger,
      NOW,
    );

    expect(account.credits).toBe(9);
    expect(account.creditsSource).toBe("manual");
  });

  it("o crédito informado para outro ano não entra neste", () => {
    const account = accountFor(
      project([snapshot("2026-07-31", 260), snapshot("2025-07-31", 240)]),
      2025,
      ledger,
      NOW,
    );

    expect(account.creditsSource).not.toBe("manual");
  });
});
