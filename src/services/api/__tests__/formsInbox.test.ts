import axios, { type InternalAxiosRequestConfig } from "axios";
import { describe, expect, it } from "vitest";
import { isApiFailure } from "../errors";

const { http } = await import("../client");
const { formsAPI } = await import("../endpoints");

describe("formsAPI.pendingImageLink — o link da imagem pendente do Pulso (OBT-585/674)", () => {
  type Reply = { status: number; data?: unknown };
  let script: (config: InternalAxiosRequestConfig) => Reply = () => ({ status: 200 });
  let lastConfig: InternalAxiosRequestConfig | null = null;

  const adapter = async (config: InternalAxiosRequestConfig) => {
    lastConfig = config;
    const reply = script(config);
    const response = {
      data: reply.data ?? null,
      status: reply.status,
      statusText: "",
      headers: {},
      config,
    };
    if (reply.status >= 200 && reply.status < 300) return response;
    throw { code: "ERR_BAD_REQUEST", config, response, isAxiosError: true };
  };

  http.defaults.adapter = adapter;
  axios.defaults.adapter = adapter;

  it("é um GET na rota da submissão, com o id codificado", async () => {
    script = () => ({ status: 200, data: { url: "https://bucket/x", expiresInMinutes: 15 } });
    await formsAPI.pendingImageLink("pulso 1/a");
    expect(lastConfig?.method).toBe("get");
    expect(lastConfig?.url).toBe("/shema/forms/submissions/pulso%201%2Fa/image/link");
  });

  it("devolve só a URL e a validade, mesmo que o servidor mande mais", async () => {
    script = () => ({
      status: 200,
      data: { url: "https://bucket/x", expiresInMinutes: 15, storageKey: "shema/x.webp" },
    });
    expect(await formsAPI.pendingImageLink("s1")).toEqual({
      url: "https://bucket/x",
      expiresInMinutes: 15,
    });
  });

  it("uma recusa rejeita, e quem chama não mostra a foto", async () => {
    script = () => ({ status: 403, data: { detail: "This item is not shared with that audience" } });
    const refused = await formsAPI.pendingImageLink("s1").catch((thrown: unknown) => thrown);
    expect(isApiFailure(refused) && refused.kind).toBe("forbidden");
  });
});
