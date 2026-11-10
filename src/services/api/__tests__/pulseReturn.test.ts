import axios, { type InternalAxiosRequestConfig } from "axios";
import { describe, expect, it } from "vitest";

const { http } = await import("../client");
const { pulseReturnAPI } = await import("../endpoints");
const { readConflict } = await import("../projectRecord");

interface Reply {
  status: number;
  data?: unknown;
  headers?: Record<string, string>;
}

let script: (config: InternalAxiosRequestConfig) => Reply;
const seen: InternalAxiosRequestConfig[] = [];

/** As in `formsApply.test.ts`: the 409 is an answer read off the response, so the double settles on `validateStatus`. */
const adapter = async (config: InternalAxiosRequestConfig) => {
  seen.push(config);
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

const last = () => seen[seen.length - 1];

const FILED = {
  id: "s9",
  kind: "pulso",
  projectId: "kadiweu",
  languageName: "Kadiwéu",
  languageNameWithheld: false,
  submittedBy: "Fresia",
  receivedAt: "2026-11-10",
  definitionVersion: 3,
  appliedAt: "2026-11-10",
};

const CONFLICT_BODY = {
  detail: "This record was saved by somebody else. Reload it before saving again.",
  code: "CONFLICT",
  expectedVersion: 7,
  currentVersion: 9,
  changedFields: ["bookProgress"],
  changedBy: "Sofia",
  changedAt: "2026-11-10T13:02:00+00:00",
};

/** Spaces a re-serializer or axios's own JSON transform would drop: the body must keep them. */
const BLOCK = ' {"projectId":"kadiweu", "definitionVersion":3,"answers":{"submittedBy":"Fresia \\u003c/script>"}} ';

describe("o bloco do arquivo devolvido vai cru a POST /forms/submissions (OBT-687, D10)", () => {
  it("o corpo é o bloco byte a byte, com If-Match, o dia local e o tipo JSON", async () => {
    script = () => ({ status: 201, data: FILED });
    await pulseReturnAPI.fileSubmission(BLOCK, '"7"');

    expect(last().method).toBe("post");
    expect(last().url).toBe("/shema/forms/submissions");
    expect(last().data).toBe(BLOCK);
    expect(last().headers["Content-Type"]).toBe("application/json");
    expect(last().headers["If-Match"]).toBe('"7"');
    expect(last().headers["X-Shema-Local-Date"]).toMatch(/^\d{4}-\d{2}-\d{2}$/u);
  });

  it("a resposta é a submissão arquivada e aplicada, como o servidor a devolve", async () => {
    script = () => ({ status: 201, data: FILED });
    expect(await pulseReturnAPI.fileSubmission(BLOCK, '"7"')).toEqual({ ok: true, submission: FILED });
  });

  it("o 409 é lido por readConflict, com o ETag da recusa", async () => {
    script = () => ({ status: 409, data: CONFLICT_BODY, headers: { etag: '"9"' } });
    const result = await pulseReturnAPI.fileSubmission(BLOCK, '"7"');

    expect(result).toEqual({
      ok: false,
      reason: "conflict",
      conflict: readConflict(CONFLICT_BODY),
      version: '"9"',
    });
  });

  it.each([
    [403, "forbidden", "Role 'coordinator' is required for this action."],
    [413, "invalid", "Request Entity Too Large"],
    [422, "invalid", "pulso v3: periodo inválido"],
  ])("%i volta como falha legível, nunca como exceção", async (status, _kind, detail) => {
    script = () => ({ status, data: { detail } });
    const result = await pulseReturnAPI.fileSubmission(BLOCK, '"7"');
    expect(result).toMatchObject({ ok: false, reason: "failed" });
  });
});

describe("a foto do arquivo devolvido vai antes, pela porta da OBT-700", () => {
  it("sobe os bytes crus para o projeto, com o tipo em Content-Type", async () => {
    const photo = new Blob([new Uint8Array([1, 2, 3])], { type: "image/webp" });
    script = () => ({ status: 201, data: { id: "img1", sha256: "ab".repeat(32) } });
    const result = await pulseReturnAPI.uploadImage("kadi weu", photo);

    expect(last().url).toBe("/shema/forms/pulse/kadi%20weu/image");
    expect(last().headers["Content-Type"]).toBe("image/webp");
    expect(last().data).toBe(photo);
    expect(result).toEqual({ ok: true, stored: { id: "img1", sha256: "ab".repeat(32) } });
  });

  it("uma recusa da porta é uma falha legível", async () => {
    script = () => ({ status: 413, data: { detail: "The image is larger than 10 MiB." } });
    const result = await pulseReturnAPI.uploadImage("kadiweu", new Blob([], { type: "image/png" }));
    expect(result).toMatchObject({ ok: false, failure: { status: 413 } });
  });
});
