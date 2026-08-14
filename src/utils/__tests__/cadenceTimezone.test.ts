import { afterAll, describe, expect, it } from "vitest";
import { parseIsoDate, periodKey, type CalendarDate } from "../cadence";

const originalTz = process.env.TZ;
process.env.TZ = "America/Sao_Paulo";

afterAll(() => {
  process.env.TZ = originalTz;
});

const on = (iso: string): CalendarDate => {
  const parsed = parseIsoDate(iso);
  if (!parsed) throw new Error(iso);
  return parsed;
};

const naivePeriod = (iso: string): string => {
  const drifting = new Date(iso);
  return `${drifting.getFullYear()}-${String(drifting.getMonth() + 1).padStart(2, "0")}`;
};

describe("as regiões atravessam fusos, o período não", () => {
  it("o relógio do navegador puxaria o dia 1 para o mês anterior", () => {
    expect(naivePeriod("2026-05-01")).toBe("2026-04");
    expect(periodKey("monthly", on("2026-05-01"))).toBe("2026-05");
  });

  it("e puxaria 1 de janeiro para o ano anterior", () => {
    expect(naivePeriod("2026-01-01")).toBe("2025-12");
    expect(periodKey("annual", on("2026-01-01"))).toBe("2026");
    expect(periodKey("quarterly", on("2026-01-01"))).toBe("2026-Q1");
  });

  it("a mesma reunião registrada dá o mesmo período em qualquer fuso", () => {
    const held = "2026-10-01";
    process.env.TZ = "Pacific/Fiji";
    const east = periodKey("quarterly", on(held));
    process.env.TZ = "America/Sao_Paulo";
    const west = periodKey("quarterly", on(held));
    expect(east).toBe(west);
    expect(west).toBe("2026-Q4");
  });
});
