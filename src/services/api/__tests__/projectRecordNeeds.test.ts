import { describe, expect, it } from "vitest";
import type { NeedItem } from "../../../types/project";
import { toWire } from "../projectRecord";

const need = (over: Partial<NeedItem> = {}): NeedItem => ({
  category: "financial",
  urgency: "low",
  status: "open",
  description: "",
  ...over,
});

describe("needsItems no envio — INT-05 (OBT-410)", () => {
  it("um pedido novo não carrega id, e o gesto de reconhecer vai como booleano", () => {
    const body = toWire({ needsItems: [need({ description: "Van" })] }, [
      "needsItems",
    ]);
    const [row] = body.needsItems as Record<string, unknown>[];
    expect(row.id).toBeUndefined();
    expect(row.acknowledged).toBe(false);
    expect(row.description).toBe("Van");
  });

  it("um pedido já salvo manda o id de volta", () => {
    const body = toWire(
      { needsItems: [need({ id: "n1", description: "Van" })] },
      ["needsItems"],
    );
    const [row] = body.needsItems as Record<string, unknown>[];
    expect(row.id).toBe("n1");
  });

  it("acknowledgedAt e acknowledgedBy nunca saem no envio — são do servidor", () => {
    const body = toWire(
      {
        needsItems: [
          need({
            id: "n1",
            acknowledgedAt: "2026-06-01",
            acknowledgedBy: "Fresia",
          }),
        ],
      },
      ["needsItems"],
    );
    const [row] = body.needsItems as Record<string, unknown>[];
    expect(row).not.toHaveProperty("acknowledgedAt");
    expect(row).not.toHaveProperty("acknowledgedBy");
  });

  it("marcar como visto localmente vira o gesto acknowledged: true", () => {
    const body = toWire(
      { needsItems: [need({ id: "n1", acknowledged: true })] },
      ["needsItems"],
    );
    const [row] = body.needsItems as Record<string, unknown>[];
    expect(row.acknowledged).toBe(true);
  });

  it("valor e moeda viajam juntos, string a string — nunca vira float", () => {
    const body = toWire(
      {
        needsItems: [
          need({ id: "n1", estimatedAmount: "1234.50", estimatedCurrency: "BRL" }),
        ],
      },
      ["needsItems"],
    );
    const [row] = body.needsItems as Record<string, unknown>[];
    expect(row.estimatedAmount).toBe("1234.50");
    expect(row.estimatedCurrency).toBe("BRL");
  });

  it("datas vazias viram null, como no resto do registro", () => {
    const body = toWire(
      { needsItems: [need({ id: "n1", deadline: "", fulfilledDate: "" })] },
      ["needsItems"],
    );
    const [row] = body.needsItems as Record<string, unknown>[];
    expect(row.deadline).toBeNull();
    expect(row.fulfilledDate).toBeNull();
  });
});
