import axios, { type InternalAxiosRequestConfig } from "axios";
import { beforeEach, describe, expect, it } from "vitest";
import type { PrayerReviewEntry } from "../../../types/prayer";

/**
 * The review queue of a sensitive project's requests, against the server (OBT-575). On the wire:
 * the queue is the server's list, and a release names the project, the need and the text the
 * coordinator read — and the edit only when there is one.
 */
const { http } = await import("../client");
const { prayerReviewAPI } = await import("../endpoints");
const { releasePayload } = await import("../../../utils/prayer");

interface Call {
  method: string;
  path: string;
  body: unknown;
}

let calls: Call[] = [];
let reply: unknown = [];

const adapter = async (config: InternalAxiosRequestConfig) => {
  const raw = config.url ?? "";
  calls.push({
    method: config.method ?? "",
    path: raw.startsWith("/api/") ? raw.slice("/api".length) : raw,
    body: typeof config.data === "string" ? JSON.parse(config.data) : (config.data ?? null),
  });
  return { data: reply, status: 200, statusText: "", headers: {}, config };
};

http.defaults.adapter = adapter;
axios.defaults.adapter = adapter;

beforeEach(() => {
  calls = [];
  reply = [];
});

const ENTRY: PrayerReviewEntry = {
  id: "garoa-pr",
  projectId: "garoa",
  needId: null,
  language: "Língua Garoa",
  source: "Formulário",
  text: "Orem pelo líder preso.",
};

describe("a fila de revisão", () => {
  it("pede ao servidor a fila e nada mais", async () => {
    reply = [ENTRY];

    const queue = await prayerReviewAPI.list();

    expect(calls.map((call) => `${call.method} ${call.path}`)).toEqual([
      "get /shema/prayer/review",
    ]);
    expect(queue).toEqual([ENTRY]);
  });

  it("libera no projeto do pedido, com o texto que a coordenação leu", async () => {
    await prayerReviewAPI.release(ENTRY.projectId, releasePayload(ENTRY, ENTRY.text));

    expect(calls).toEqual([
      {
        method: "post",
        path: "/shema/projects/garoa/prayer/release",
        body: { needId: null, reviewed: "Orem pelo líder preso." },
      },
    ]);
  });
});

describe("o que a liberação manda", () => {
  it("só manda o texto quando a coordenação editou", () => {
    expect(releasePayload(ENTRY, "  Orem pelo líder preso.  ")).toEqual({
      needId: null,
      reviewed: ENTRY.text,
    });
    expect(releasePayload(ENTRY, "")).toEqual({ needId: null, reviewed: ENTRY.text });
    expect(releasePayload({ ...ENTRY, needId: "n-7" }, " Orem por um irmão. ")).toEqual({
      needId: "n-7",
      reviewed: ENTRY.text,
      text: "Orem por um irmão.",
    });
  });
});
