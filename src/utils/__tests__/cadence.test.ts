import { describe, expect, it } from "vitest";
import {
  compareCalendarDates,
  coversPeriod,
  daysInMonth,
  formatIsoDate,
  isLeapYear,
  nextDeadline,
  parseIsoDate,
  periodEnd,
  periodKey,
  periodStart,
  previousPeriodKey,
  quarterOf,
  shiftPeriods,
  toCalendarDate,
  type CalendarDate,
} from "../cadence";

const on = (iso: string): CalendarDate => {
  const parsed = parseIsoDate(iso);
  if (!parsed) throw new Error(iso);
  return parsed;
};

const endOf = (cadence: "monthly" | "quarterly" | "annual", iso: string) =>
  formatIsoDate(periodEnd(cadence, on(iso)));

const nextOf = (cadence: "monthly" | "quarterly" | "annual", iso: string) =>
  formatIsoDate(nextDeadline(cadence, on(iso)));

describe("uma data ISO vale a mesma coisa em qualquer fuso", () => {
  it("é lida por campo, nunca pelo relógio do navegador", () => {
    expect(on("2026-05-01")).toEqual({ year: 2026, month: 5, day: 1 });
    expect(periodKey("monthly", on("2026-05-01"))).toBe("2026-05");
  });

  it("o primeiro dia do mês cai no período que está escrito nele", () => {
    for (const iso of ["2026-01-01", "2026-05-01", "2026-12-01"]) {
      expect(periodKey("monthly", on(iso)), iso).toBe(iso.slice(0, 7));
    }
  });

  it("recusa o que não é data de calendário", () => {
    expect(parseIsoDate("")).toBeNull();
    expect(parseIsoDate("2026-13-01")).toBeNull();
    expect(parseIsoDate("2026-02-30")).toBeNull();
    expect(parseIsoDate("14/05/2026")).toBeNull();
    expect(parseIsoDate("2026-2-1")).toBeNull();
  });

  it("29 de fevereiro só existe em ano bissexto", () => {
    expect(parseIsoDate("2024-02-29")).not.toBeNull();
    expect(parseIsoDate("2026-02-29")).toBeNull();
    expect(isLeapYear(2000)).toBe(true);
    expect(isLeapYear(2100)).toBe(false);
    expect(daysInMonth(2024, 2)).toBe(29);
    expect(daysInMonth(2100, 2)).toBe(28);
  });
});

describe("o mensal contado a partir do dia 31", () => {
  it("fecha no último dia do próprio mês, não no dia 31 do seguinte", () => {
    expect(endOf("monthly", "2026-01-31")).toBe("2026-01-31");
    expect(nextOf("monthly", "2026-01-31")).toBe("2026-02-28");
  });

  it("em ano bissexto o mês seguinte tem 29", () => {
    expect(nextOf("monthly", "2024-01-31")).toBe("2024-02-29");
  });

  it("o dia 31 não inventa um 31 de abril", () => {
    expect(nextOf("monthly", "2026-03-31")).toBe("2026-04-30");
  });

  it("o período anterior a janeiro é dezembro do ano passado", () => {
    expect(previousPeriodKey("monthly", on("2026-01-31"))).toBe("2025-12");
  });
});

describe("o trimestral contado a partir de 30 de novembro", () => {
  it("30 de novembro é T4 e fecha em 31 de dezembro", () => {
    expect(quarterOf(11)).toBe(4);
    expect(periodKey("quarterly", on("2026-11-30"))).toBe("2026-Q4");
    expect(endOf("quarterly", "2026-11-30")).toBe("2026-12-31");
  });

  it("o próximo trimestre atravessa o ano e fecha em 31 de março", () => {
    expect(nextOf("quarterly", "2026-11-30")).toBe("2027-03-31");
  });

  it("o trimestre anterior a T4 é T3 do mesmo ano", () => {
    expect(previousPeriodKey("quarterly", on("2026-11-30"))).toBe("2026-Q3");
  });

  it("o trimestre anterior a T1 é T4 do ano passado", () => {
    expect(previousPeriodKey("quarterly", on("2026-01-15"))).toBe("2025-Q4");
  });

  it("cada trimestre começa no primeiro mês dele", () => {
    expect(formatIsoDate(periodStart("quarterly", on("2026-11-30")))).toBe(
      "2026-10-01",
    );
    expect(endOf("quarterly", "2026-02-15")).toBe("2026-03-31");
  });
});

describe("o anual atravessando um ano bissexto", () => {
  it("fecha em 31 de dezembro tanto no bissexto quanto no seguinte", () => {
    expect(endOf("annual", "2024-02-29")).toBe("2024-12-31");
    expect(nextOf("annual", "2024-02-29")).toBe("2025-12-31");
  });

  it("o ano anterior a 2024 é 2023, e o período é só o ano", () => {
    expect(periodKey("annual", on("2024-02-29"))).toBe("2024");
    expect(previousPeriodKey("annual", on("2024-02-29"))).toBe("2023");
  });

  it("fevereiro de 29 continua dentro do período do ano", () => {
    expect(coversPeriod("annual", "2024-02-29", on("2024-11-05"))).toBe(true);
  });
});

describe("um período cobre a data ou não cobre", () => {
  it("o mês corrente cobre qualquer dia dele e nenhum de fora", () => {
    const may = on("2026-05-14");
    expect(coversPeriod("monthly", "2026-05-01", may)).toBe(true);
    expect(coversPeriod("monthly", "2026-05-31", may)).toBe(true);
    expect(coversPeriod("monthly", "2026-04-30", may)).toBe(false);
    expect(coversPeriod("monthly", "2026-06-01", may)).toBe(false);
  });

  it("uma data ilegível nunca conta como reportada", () => {
    expect(coversPeriod("monthly", "", on("2026-05-14"))).toBe(false);
    expect(coversPeriod("monthly", "14/05/2026", on("2026-05-14"))).toBe(false);
  });

  it("o trimestre cobre os três meses dele", () => {
    const q2 = on("2026-05-14");
    expect(coversPeriod("quarterly", "2026-04-01", q2)).toBe(true);
    expect(coversPeriod("quarterly", "2026-06-30", q2)).toBe(true);
    expect(coversPeriod("quarterly", "2026-07-01", q2)).toBe(false);
  });
});

describe("as datas se ordenam e voltam a texto sem perda", () => {
  it("ida e volta preserva a data", () => {
    for (const iso of ["2024-02-29", "2026-01-31", "2026-12-31"]) {
      expect(formatIsoDate(on(iso))).toBe(iso);
    }
  });

  it("compara por calendário, não por texto solto", () => {
    expect(compareCalendarDates(on("2026-01-31"), on("2026-02-01"))).toBeLessThan(0);
    expect(compareCalendarDates(on("2026-02-01"), on("2026-02-01"))).toBe(0);
  });

  it("um passo para trás e outro para frente devolve o mesmo período", () => {
    const start = on("2026-11-30");
    const back = shiftPeriods("quarterly", start, -1);
    expect(periodKey("quarterly", shiftPeriods("quarterly", back, 1))).toBe(
      periodKey("quarterly", start),
    );
  });

  it("o dia local do coordenador é o dia que entra no calendário", () => {
    expect(toCalendarDate(new Date(2026, 4, 14, 23, 30))).toEqual({
      year: 2026,
      month: 5,
      day: 14,
    });
  });
});
