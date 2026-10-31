import axios, { type InternalAxiosRequestConfig } from "axios";
import { describe, expect, it } from "vitest";

const { http } = await import("../client");
const { formsAPI } = await import("../endpoints");
const { readConflict } = await import("../projectRecord");

interface Reply {
  status: number;
  data?: unknown;
  headers?: Record<string, string>;
}

let script: (config: InternalAxiosRequestConfig) => Reply;
let lastConfig: InternalAxiosRequestConfig | null = null;

/** As in `projectRecord.test.ts`: the 409 is an answer read off the response, so the double settles on `validateStatus`. */
const adapter = async (config: InternalAxiosRequestConfig) => {
  lastConfig = config;
  const reply = script(config);
  const response = {
    data: reply.data ?? null,
    status: reply.status,
    statusText: "",
    headers: reply.headers ?? {},
    config,
  };
  const accepted = config.validateStatus
    ? config.validateStatus(reply.status)
    : reply.status >= 200 && reply.status < 300;
  if (accepted) return response;
  throw Object.assign(new Error(`status ${reply.status}`), {
    isAxiosError: true,
    code: "ERR_BAD_REQUEST",
    config,
    response,
  });
};

http.defaults.adapter = adapter;
axios.defaults.adapter = adapter;

const APPLIED = {
  id: "s1",
  kind: "pulso",
  projectId: "kadiweu",
  languageName: "Kadiwéu",
  languageNameWithheld: false,
  submittedBy: "Fresia",
  receivedAt: "2026-10-28",
  definitionVersion: 1,
  appliedAt: "2026-10-30",
};

const CONFLICT_BODY = {
  detail: "This record was saved by somebody else. Reload it before saving again.",
  code: "CONFLICT",
  expectedVersion: 7,
  currentVersion: 9,
  changedFields: ["bookProgress", "translatedUnits", "statusComments"],
  changedBy: "Sofia",
  changedAt: "2026-10-30T13:02:00+00:00",
};

describe("aplicar um Pulso da caixa na ficha (OBT-652)", () => {
  it("vai à porta da caixa citando a versão lida no If-Match e o dia local de quem aplica", async () => {
    script = () => ({ status: 200, data: APPLIED });
    await formsAPI.applySubmission("s 1", '"7"');

    expect(lastConfig?.method).toBe("post");
    expect(lastConfig?.url).toBe("/shema/forms/submissions/s%201/import");
    expect(lastConfig?.headers["If-Match"]).toBe('"7"');
    expect(lastConfig?.headers["X-Shema-Local-Date"]).toMatch(/^\d{4}-\d{2}-\d{2}$/u);
  });

  it("a resposta é a submissão como o servidor a devolve, já com o dia em que foi aplicada", async () => {
    script = () => ({ status: 200, data: APPLIED });
    const result = await formsAPI.applySubmission("s1", '"7"');

    expect(result).toEqual({ ok: true, submission: APPLIED });
  });
});

describe("o 409 de versão velha é lido pelo leitor do PATCH da ficha (OBT-646)", () => {
  it("volta como resposta, com o conflito igual ao que readConflict lê do mesmo corpo", async () => {
    script = () => ({ status: 409, data: CONFLICT_BODY, headers: { etag: '"9"' } });
    const result = await formsAPI.applySubmission("s1", '"7"');

    expect(result.ok).toBe(false);
    if (result.ok || result.reason !== "conflict") throw new Error("esperava um conflito");
    expect(result.conflict).toEqual(readConflict(CONFLICT_BODY));
    expect(result.conflict.changedBy).toBe("Sofia");
    expect(result.conflict.changedFields).toEqual(["bookProgress", "translatedUnits", "statusComments"]);
  });

  it("a versão para a nova tentativa é o ETag da recusa — a que o painel descreve", async () => {
    script = () => ({ status: 409, data: CONFLICT_BODY, headers: { etag: '"9"' } });
    const result = await formsAPI.applySubmission("s1", '"7"');

    expect(result).toMatchObject({ ok: false, reason: "conflict", version: '"9"' });
  });

  it("uma recusa sem ETag diz que não trouxe versão, em vez de inventar uma", async () => {
    script = () => ({ status: 409, data: CONFLICT_BODY });
    const result = await formsAPI.applySubmission("s1", '"7"');

    expect(result).toMatchObject({ ok: false, reason: "conflict", version: "" });
  });
});

describe("as outras respostas voltam como falha legível, nunca como exceção solta", () => {
  it.each([
    [403, "forbidden", "Role 'coordinator' is required for this action."],
    [404, "notFound", "Project not found"],
    [400, "invalid", "If-Match: 'abc' is not a version this record has had"],
  ])("%i ⇒ %s", async (status, kind, detail) => {
    script = () => ({ status, data: { detail } });
    const result = await formsAPI.applySubmission("s1", '"7"');

    expect(result).toMatchObject({ ok: false, reason: "failed", failure: { kind } });
  });
});
