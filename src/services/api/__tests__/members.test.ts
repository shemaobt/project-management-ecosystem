import axios, { type InternalAxiosRequestConfig } from "axios";
import { describe, expect, it } from "vitest";
import * as fixture from "../../../fixtures";
import { isApiFailure } from "../errors";

const { http } = await import("../client");
const { membersAPI } = await import("../endpoints");

describe("membersAPI — o transporte da BE-18 (OBT-524)", () => {
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
    throw { code: "ERR_BAD_REQUEST", config, response };
  };

  http.defaults.adapter = adapter;
  axios.defaults.adapter = adapter;

  const member = {
    userId: "u-1",
    name: "Membro de Teste",
    role: "equipe" as const,
    addedAt: "2026-09-27",
  };

  it("a lista de um projeto é um GET no caminho do projeto, com o id codificado", async () => {
    script = () => ({ status: 200, data: [member] });
    const result = await membersAPI.list("são tomé/1");
    expect(lastConfig?.method).toBe("get");
    expect(lastConfig?.url).toBe("/shema/projects/s%C3%A3o%20tom%C3%A9%2F1/members");
    expect(result).toEqual([member]);
  });

  it("adicionar manda só a conta no corpo — o papel é do servidor", async () => {
    script = () => ({ status: 201, data: member });
    const result = await membersAPI.add("kadiweu", "u-1");
    expect(lastConfig?.method).toBe("post");
    expect(lastConfig?.url).toBe("/shema/projects/kadiweu/members");
    expect(JSON.parse(String(lastConfig?.data))).toEqual({ userId: "u-1" });
    expect(result).toEqual(member);
  });

  it("remover é um DELETE no membro, com os dois ids codificados", async () => {
    script = () => ({ status: 204 });
    await membersAPI.remove("kadiweu", "u 1");
    expect(lastConfig?.method).toBe("delete");
    expect(lastConfig?.url).toBe("/shema/projects/kadiweu/members/u%201");
  });

  it("os meus projetos são um GET em /me/projects", async () => {
    script = () => ({ status: 200, data: [{ id: "kadiweu", languageName: "Kadiwéu" }] });
    const result = await membersAPI.mine();
    expect(lastConfig?.method).toBe("get");
    expect(lastConfig?.url).toBe("/shema/me/projects");
    expect(result).toEqual([{ id: "kadiweu", languageName: "Kadiwéu" }]);
  });

  it("a recusa do servidor chega como a falha dele, não como lista vazia", async () => {
    script = () => ({ status: 404, data: { detail: "Project not found", code: "NOT_FOUND" } });
    await expect(membersAPI.list("de-outra-regiao")).rejects.toBeTruthy();
  });
});

describe("membersAPI — o dublê de fixtures é honesto", () => {
  it("nenhuma conta, nenhum membro: as listas são vazias e ninguém é inventado", async () => {
    expect(await fixture.membersAPI.list("kadiweu")).toEqual([]);
    expect(await fixture.membersAPI.mine()).toEqual([]);
  });

  it("as escritas são recusadas como o servidor recusa as quatro personas — só o Admin escreve", async () => {
    for (const write of [
      () => fixture.membersAPI.add("kadiweu", "u-1"),
      () => fixture.membersAPI.remove("kadiweu", "u-1"),
    ]) {
      const refusal = await write().then(
        () => null,
        (raw: unknown) => raw,
      );
      expect(isApiFailure(refusal)).toBe(true);
      if (isApiFailure(refusal)) expect(refusal.kind).toBe("forbidden");
    }
  });
});
