import { describe, expect, it } from "vitest";
import { CURRENCY_CODES, isCurrencyCode } from "../../constants/currencies";
import { formatMoney, listCurrencies } from "../currency";

describe("moeda sempre com o valor — INT-05 (OBT-410)", () => {
  it("um valor nunca aparece sozinho — a moeda vai junto", () => {
    expect(formatMoney("1234.5", "BRL", "pt-BR")).toContain("1.234,50");
    expect(formatMoney("1234.5", "BRL", "pt-BR")).toMatch(/R\$/);
  });

  it("mesmo um código que o Intl não reconhece ainda carrega o próprio código", () => {
    expect(formatMoney("10", "ZZZ", "pt-BR")).toContain("ZZZ");
  });

  it("um valor que não é número ainda sai com a moeda ao lado, nunca como um número cru", () => {
    expect(formatMoney("não é número", "BRL", "pt-BR")).toBe("não é número BRL");
  });

  it("nada converte — o mesmo valor em moedas diferentes não é igualado", () => {
    const brl = formatMoney("100", "BRL", "pt-BR");
    const usd = formatMoney("100", "USD", "pt-BR");
    expect(brl).not.toBe(usd);
  });

  it("a lista curada é toda ISO-4217 e tem nome em cada idioma", () => {
    expect(CURRENCY_CODES.every((code) => isCurrencyCode(code))).toBe(true);
    const pt = listCurrencies("pt-BR");
    const en = listCurrencies("en-US");
    expect(pt).toHaveLength(CURRENCY_CODES.length);
    expect(en).toHaveLength(CURRENCY_CODES.length);
    expect(pt.every((entry) => entry.name.length > 0)).toBe(true);
  });
});
