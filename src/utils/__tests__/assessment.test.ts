import { describe, expect, it } from "vitest";
import { HEALTH_DIMENSIONS } from "../../constants/health";
import { GUIDING_QUESTIONS, QUESTIONS_PENDING_CLIENT } from "../../constants/healthQuestions";
import type { AssessmentDraft } from "../../types/assessment";
import {
  assessedCount,
  compileNotes,
  emptyDraft,
  overallOf,
  pastoralSuggestion,
  toAssessment,
} from "../assessment";

const NOW = new Date(2026, 4, 14);
const label = (key: string) => key;

const draft = (over: Partial<AssessmentDraft> = {}): AssessmentDraft => ({
  ...emptyDraft("kadiweu", NOW),
  ...over,
});

describe("as quatro dimensões abrem sem nota e sem avaliação", () => {
  it("um rascunho novo não dá nenhuma dimensão como boa", () => {
    const fresh = emptyDraft("kadiweu", NOW);

    for (const dimension of HEALTH_DIMENSIONS) {
      expect(fresh.ratings[dimension.key], dimension.key).toBe("");
    }
    expect(assessedCount(fresh)).toBe(0);
    expect(overallOf(fresh)).toBe("na");
  });

  it("cada dimensão tem perguntas-guia, e nenhuma está pendente da cliente", () => {
    for (const dimension of HEALTH_DIMENSIONS) {
      expect(
        GUIDING_QUESTIONS[dimension.key].length,
        dimension.key,
      ).toBeGreaterThan(0);
    }
    expect(QUESTIONS_PENDING_CLIENT).toEqual([]);
  });
});

describe("pular uma dimensão grava não avaliada, nunca boa", () => {
  it("três boas e uma pulada não somam quatro boas", () => {
    const partial = draft({
      ratings: {
        emotional: "boa",
        relational: "boa",
        spiritual: "boa",
        physical: "",
      },
    });

    expect(assessedCount(partial)).toBe(3);
    expect(partial.ratings.physical).toBe("");
    expect(partial.ratings.physical).not.toBe("boa");
  });

  it("a leitura geral de tudo pulado é não avaliada, não boa", () => {
    expect(overallOf(draft())).toBe("na");
    expect(overallOf(draft())).not.toBe("boa");
  });

  it("uma crítica pesa mais que três boas", () => {
    const mixed = draft({
      ratings: {
        emotional: "boa",
        relational: "boa",
        spiritual: "boa",
        physical: "critica",
      },
    });

    expect(overallOf(mixed)).toBe("critica");
  });

  it("atenção só vence quando não há crítica", () => {
    const attention = draft({
      ratings: {
        emotional: "atencao",
        relational: "boa",
        spiritual: "",
        physical: "",
      },
    });

    expect(overallOf(attention)).toBe("atencao");
  });
});

describe("o cuidado pastoral é sugerido com motivo, e nunca se aplica sozinho", () => {
  it("uma dimensão crítica sugere, e diz qual foi", () => {
    const critical = draft({
      ratings: {
        emotional: "critica",
        relational: "boa",
        spiritual: "",
        physical: "",
      },
    });
    const suggestion = pastoralSuggestion(critical);

    expect(suggestion.suggested).toBe(true);
    expect(suggestion.reasons).toEqual([
      { dimension: "emotional", rating: "critica" },
    ]);
  });

  it("atenção também sugere, e as razões acumulam", () => {
    const both = draft({
      ratings: {
        emotional: "atencao",
        relational: "critica",
        spiritual: "boa",
        physical: "",
      },
    });
    const suggestion = pastoralSuggestion(both);

    expect(suggestion.reasons.map((reason) => reason.dimension)).toEqual([
      "emotional",
      "relational",
    ]);
  });

  it("tudo bem não sugere nada", () => {
    const well = draft({
      ratings: {
        emotional: "boa",
        relational: "boa",
        spiritual: "boa",
        physical: "boa",
      },
    });

    expect(pastoralSuggestion(well)).toEqual({ suggested: false, reasons: [] });
  });

  it("sugerir não é aplicar: a resposta continua não até alguém trocar", () => {
    const critical = draft({
      ratings: {
        emotional: "critica",
        relational: "",
        spiritual: "",
        physical: "",
      },
    });

    expect(pastoralSuggestion(critical).suggested).toBe(true);
    expect(critical.pastoral).toBe("nao");
    expect(toAssessment(critical, label).date).toBe("2026-05-14");
  });
});

describe("a anotação por dimensão é o dado; a nota corrida é uma leitura dela", () => {
  const spoken = draft({
    notes: {
      emotional: "Dormindo mal desde a enchente.",
      relational: "",
      spiritual: "Oração junto voltou.",
      physical: "",
    },
    overallNote: "Voltar em junho.",
  });

  it("a avaliação guarda cada anotação separada", () => {
    expect(toAssessment(spoken, label).dimensionNotes).toEqual({
      emotional: "Dormindo mal desde a enchente.",
      relational: "",
      spiritual: "Oração junto voltou.",
      physical: "",
    });
  });

  it("a nota corrida junta só o que foi dito, sem inventar rótulo vazio", () => {
    const compiled = compileNotes(spoken, label);

    expect(compiled).toContain("d_emotional: Dormindo mal desde a enchente.");
    expect(compiled).toContain("d_spiritual: Oração junto voltou.");
    expect(compiled).not.toContain("d_relational");
    expect(compiled.endsWith("Voltar em junho.")).toBe(true);
  });

  it("sem nada dito, a nota corrida é vazia em vez de rótulos soltos", () => {
    expect(compileNotes(draft(), label)).toBe("");
  });
});
