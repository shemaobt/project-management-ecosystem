import axios, { type InternalAxiosRequestConfig } from "axios";
import { describe, expect, it } from "vitest";
import { CURRENT_QUESTION_SET_VERSION } from "../../../constants/health";
import { createEmptyProject } from "../../../fixtures";
import type { AssessmentDraft } from "../../../types/assessment";
import { emptyDraft } from "../../../utils/assessment";

const { http } = await import("../client");
const { buildSubmission, healthAssessmentsAPI } = await import(
  "../healthAssessments"
);

const NOW = new Date(2026, 4, 14);

const draft = (over: Partial<AssessmentDraft> = {}): AssessmentDraft => ({
  ...emptyDraft("kadiweu", NOW),
  ...over,
});

describe("buildSubmission — o wizard fala a forma da BE-07", () => {
  it("uma dimensão não avaliada vira null, nunca a string vazia", () => {
    const body = buildSubmission(draft());
    expect(body.emotional).toBeNull();
    expect(body.relational).toBeNull();
  });

  it("uma dimensão avaliada viaja como está", () => {
    const body = buildSubmission(
      draft({
        ratings: {
          emotional: "critica",
          relational: "",
          spiritual: "",
          physical: "",
        },
      }),
    );
    expect(body.emotional).toBe("critica");
  });

  it("carimba a versão do conjunto de perguntas que o wizard renderiza", () => {
    expect(buildSubmission(draft()).questionSetVersion).toBe(
      CURRENT_QUESTION_SET_VERSION,
    );
  });

  it("a resposta pastoral sempre viaja, com ou sem pedido de oração", () => {
    const body = buildSubmission(
      draft({ pastoral: "sim", pastoralWhen: "30d", pastoralWho: "Daniel" }),
    );
    expect(body.needsPastoralIntervention).toBe("sim");
    expect(body.pastoralInterventionWhen).toBe("30d");
    expect(body.pastoralInterventionName).toBe("Daniel");
  });

  it("sem pedido escrito, os campos de oração não viajam", () => {
    const body = buildSubmission(draft());
    expect("prayerRequests" in body).toBe(false);
    expect("prayerVisibility" in body).toBe(false);
  });

  it("um pedido escrito viaja com a visibilidade escolhida", () => {
    const body = buildSubmission(
      draft({
        prayerRequest: "  Orem pela equipe.  ",
        prayerVisibility: "rede",
      }),
    );
    expect(body.prayerRequests).toBe("Orem pela equipe.");
    expect(body.prayerVisibility).toBe("rede");
  });

  it("a nota geral do wizard não entra no corpo — BE-07 não tem onde guardá-la", () => {
    const body = buildSubmission(
      draft({ overallNote: "Voltar em junho." }),
    );
    expect(JSON.stringify(body)).not.toContain("Voltar em junho.");
  });

  it("a anotação por dimensão viaja verbatim, sem rótulo", () => {
    const body = buildSubmission(
      draft({
        notes: {
          emotional: "Dormindo mal desde a enchente.",
          relational: "",
          spiritual: "",
          physical: "",
        },
      }),
    );
    expect(body.dimensionNotes).toEqual({
      emotional: "Dormindo mal desde a enchente.",
      relational: "",
      spiritual: "",
      physical: "",
    });
  });
});

describe("healthAssessmentsAPI.submit — o transporte", () => {
  type Reply = { status: number; data?: unknown; headers?: Record<string, string> };
  let script: (config: InternalAxiosRequestConfig) => Reply;
  let lastConfig: InternalAxiosRequestConfig | null = null;

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
    if (reply.status >= 200 && reply.status < 300) return response;
    throw { code: "ERR_BAD_REQUEST", config, response };
  };

  http.defaults.adapter = adapter;
  axios.defaults.adapter = adapter;

  it("carrega o dia local do ator no cabeçalho, não o dia do servidor", async () => {
    script = () => ({ status: 201, data: { id: "kadiweu" }, headers: { etag: '"2"' } });
    await healthAssessmentsAPI.submit("kadiweu", draft());
    expect(lastConfig?.headers?.["X-Shema-Local-Date"]).toMatch(
      /^\d{4}-\d{2}-\d{2}$/,
    );
  });

  it("um 422 vira uma recusa localizável, nunca uma exceção", async () => {
    script = () => ({
      status: 422,
      data: {
        detail: [
          {
            loc: ["body", "emotional"],
            msg: "an assessment rates at least one dimension",
          },
        ],
      },
    });
    const result = await healthAssessmentsAPI.submit("kadiweu", draft());
    expect(result.ok).toBe(false);
    if (!result.ok && result.reason === "invalid") {
      expect(result.errors[0].message).toContain(
        "an assessment rates at least one dimension",
      );
    }
  });

  it("uma resposta 201 devolve o registro e a nova versão", async () => {
    script = () => ({
      status: 201,
      data: { ...createEmptyProject("kadiweu"), languageName: "Kadiwéu" },
      headers: { etag: '"7"' },
    });
    const result = await healthAssessmentsAPI.submit("kadiweu", draft());
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.record.project.languageName).toBe("Kadiwéu");
      expect(result.record.version).toBe('"7"');
    }
  });
});
