import axios, { type InternalAxiosRequestConfig } from "axios";
import { beforeEach, describe, expect, it } from "vitest";

/**
 * The wall and the Prayer Pulse against the server (INT-06 · OBT-411). What the DoD asks to see
 * **on the wire, not on the screen**: the wall asks the server for the wall and for nothing else
 * — never whole projects to filter here — and the Pulse is the server's file, saved under the
 * name the server gives it.
 */
const { http } = await import("../client");
const { prayerAPI, prayerPulseAPI, pulseFileName, pulseLanguage } = await import("../endpoints");

interface Call {
  method: string;
  path: string;
  params: unknown;
  responseType: unknown;
}

let calls: Call[] = [];
let reply: { data: unknown; headers: Record<string, string> } = { data: [], headers: {} };

const adapter = async (config: InternalAxiosRequestConfig) => {
  const raw = config.url ?? "";
  calls.push({
    method: config.method ?? "",
    path: raw.startsWith("/api/") ? raw.slice("/api".length) : raw,
    params: config.params ?? null,
    responseType: config.responseType ?? null,
  });
  return { data: reply.data, status: 200, statusText: "", headers: reply.headers, config };
};

http.defaults.adapter = adapter;
axios.defaults.adapter = adapter;

beforeEach(() => {
  calls = [];
});

describe("o mural", () => {
  it("pede ao servidor o mural e nada mais", async () => {
    reply = {
      data: [{ id: "p-1", projectId: "p", text: "Orem pela gravação.", region: "asia" }],
      headers: {},
    };

    const wall = await prayerAPI.list();

    expect(calls.map((call) => `${call.method} ${call.path}`)).toEqual([
      "get /shema/prayer/requests",
    ]);
    expect(wall).toHaveLength(1);
  });
});

describe("o Pulso de Oração", () => {
  it("é o arquivo do servidor, na língua da tela, com o nome que o servidor dá", async () => {
    reply = {
      data: "PULSO DE ORAÇÃO\n…",
      headers: { "content-disposition": 'attachment; filename="pulso-2026-10-01.txt"' },
    };

    const file = await prayerPulseAPI.generate("en");

    expect(calls).toEqual([
      { method: "get", path: "/shema/prayer/pulse", params: { lang: "en" }, responseType: "text" },
    ]);
    expect(file).toEqual({ text: "PULSO DE ORAÇÃO\n…", fileName: "pulso-2026-10-01.txt" });
  });

  it("sem cabeçalho legível, salva com um nome neutro", () => {
    expect(pulseFileName(undefined)).toBe("pulso-de-oracao.txt");
    expect(pulseFileName("attachment")).toBe("pulso-de-oracao.txt");
  });

  it("a língua do arquivo segue a da tela", () => {
    expect(pulseLanguage("en-US")).toBe("en");
    expect(pulseLanguage("en")).toBe("en");
    expect(pulseLanguage("pt-BR")).toBe("pt-BR");
    expect(pulseLanguage("pt")).toBe("pt-BR");
  });
});
