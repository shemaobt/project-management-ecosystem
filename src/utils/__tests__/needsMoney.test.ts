import { describe, expect, it } from "vitest";
import type { NeedItem } from "../../types/project";
import {
  daysSinceRaised,
  isUnacknowledged,
  needMoneyError,
  UNACKNOWLEDGED_AFTER_DAYS,
  unacknowledgedNeeds,
} from "../needs";

const need = (over: Partial<NeedItem> = {}): NeedItem => ({
  category: "financial",
  urgency: "low",
  status: "open",
  description: "",
  ...over,
});

describe("mostre as que ninguém tocou — INT-05 (OBT-410)", () => {
  const now = new Date("2026-09-11T12:00:00");

  it("aberto, sem carimbo e velho o bastante conta como não reconhecido", () => {
    const old = need({ submittedAt: "2026-08-01" });
    expect(daysSinceRaised(old, now)).toBeGreaterThanOrEqual(UNACKNOWLEDGED_AFTER_DAYS);
    expect(isUnacknowledged(old, now)).toBe(true);
  });

  it("recém-levantado não conta, mesmo sem carimbo", () => {
    const fresh = need({ submittedAt: "2026-09-05" });
    expect(isUnacknowledged(fresh, now)).toBe(false);
  });

  it("uma vez visto, para de contar mesmo que o pedido continue aberto", () => {
    const seen = need({ submittedAt: "2026-08-01", acknowledgedAt: "2026-08-02" });
    expect(isUnacknowledged(seen, now)).toBe(false);
  });

  it("encerrado (atendido ou descartado) não é 'ninguém viu'", () => {
    for (const status of ["fulfilled", "dropped"] as const) {
      const closed = need({ submittedAt: "2026-01-01", status });
      expect(isUnacknowledged(closed, now), status).toBe(false);
    }
  });

  it("sem data de nascimento, não dá para dizer que está velho", () => {
    expect(isUnacknowledged(need(), now)).toBe(false);
  });

  it("a lista filtra só os esquecidos", () => {
    const list = [
      need({ submittedAt: "2026-08-01" }),
      need({ submittedAt: "2026-09-05" }),
      need({ submittedAt: "2026-08-01", status: "fulfilled" }),
    ];
    expect(unacknowledgedNeeds(list, now)).toHaveLength(1);
  });

  it("valor sem moeda, ou moeda sem valor, é o mesmo erro visto de dois lados", () => {
    expect(needMoneyError(need({ estimatedAmount: "100" }))).toBe("currency");
    expect(needMoneyError(need({ estimatedCurrency: "BRL" }))).toBe("amount");
    expect(needMoneyError(need({ estimatedAmount: "100", estimatedCurrency: "BRL" }))).toBeNull();
    expect(needMoneyError(need())).toBeNull();
  });
});
