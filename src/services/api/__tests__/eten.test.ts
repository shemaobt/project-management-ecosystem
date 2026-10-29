import axios, { type InternalAxiosRequestConfig } from "axios";
import { beforeEach, describe, expect, it } from "vitest";

/**
 * O ETEN contra o servidor (OBT-657). A tela imprime *Projeto sensível — África* no lugar da chave
 * de um projeto sensível sem nome público, e o servidor ordena a linha por esse nome impresso — na
 * língua que o console diz no cabeçalho, porque em português ela cai entre os P e em inglês entre os
 * S. A língua nunca vai na URL: não é filtro, e um servidor que não a lê a ignora.
 */
const { http } = await import("../client");
const { etenAPI } = await import("../endpoints");

let lastConfig: InternalAxiosRequestConfig | null = null;

const adapter = async (config: InternalAxiosRequestConfig) => {
  lastConfig = config;
  return { data: { snapshots: [] }, status: 200, statusText: "", headers: {}, config };
};

http.defaults.adapter = adapter;
axios.defaults.adapter = adapter;

beforeEach(() => {
  lastConfig = null;
});

describe("o relatório ETEN", () => {
  it.each(["pt-BR", "en"] as const)(
    "é pedido na língua da tela (%s), no cabeçalho e não na URL",
    async (language) => {
      await etenAPI.report(2026, language);
      expect(lastConfig?.url).toBe("/shema/eten/report");
      expect(lastConfig?.params).toEqual({ year: 2026 });
      expect(lastConfig?.headers.get("X-Shema-Language")).toBe(language);
    },
  );
});
