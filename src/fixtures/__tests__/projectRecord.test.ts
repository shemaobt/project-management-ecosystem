import { beforeEach, describe, expect, it } from "vitest";
import { CURRENT_QUESTION_SET_VERSION } from "../../constants/health";
import { emptyDraft } from "../../utils/assessment";
import { createEmptyProject } from "../blank";
import { createRecord, resetRecordOverlay, submitAssessment } from "../projectRecord";

const NOW = new Date(2026, 4, 14);

beforeEach(() => {
  resetRecordOverlay();
});

const seeded = () => createRecord({ ...createEmptyProject("kadiweu"), languageName: "Kadiwéu" });

describe("submitAssessment — o duplo do POST .../health-assessments (BE-07)", () => {
  it("sem registro, recusa nomeando o id", () => {
    const outcome = submitAssessment("no-such-id", emptyDraft("no-such-id", NOW), "Ana");
    expect(outcome.ok).toBe(false);
    if (!outcome.ok && outcome.reason === "invalid") {
      expect(outcome.errors[0].message).toContain("no-such-id");
    }
  });

  it("carimba author, questionSetVersion e overall na entrada nova", () => {
    seeded();
    const draft = {
      ...emptyDraft("kadiweu", NOW),
      ratings: {
        emotional: "boa" as const,
        relational: "atencao" as const,
        spiritual: "" as const,
        physical: "" as const,
      },
    };

    const outcome = submitAssessment("kadiweu", draft, "Ana Coordenadora");
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;

    const entry = outcome.record.project.healthHistory?.[0];
    expect(entry?.author).toBe("Ana Coordenadora");
    expect(entry?.questionSetVersion).toBe(CURRENT_QUESTION_SET_VERSION);
    expect(entry?.overall).toBe("atencao");
  });

  it("um assessor em branco cai para quem está filiando a leitura", () => {
    seeded();
    const draft = {
      ...emptyDraft("kadiweu", NOW),
      assessor: "",
      ratings: {
        emotional: "boa" as const,
        relational: "boa" as const,
        spiritual: "boa" as const,
        physical: "boa" as const,
      },
    };

    const outcome = submitAssessment("kadiweu", draft, "Ana Coordenadora");
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.record.project.healthAssessor).toBe("Ana Coordenadora");
  });

  it("as notas compiladas usam os nomes das dimensões, nunca a chave crua — e a nota geral não viaja", () => {
    seeded();
    const draft = {
      ...emptyDraft("kadiweu", NOW),
      ratings: {
        emotional: "atencao" as const,
        relational: "" as const,
        spiritual: "" as const,
        physical: "" as const,
      },
      notes: {
        emotional: "Dormindo mal",
        relational: "",
        spiritual: "",
        physical: "",
      },
      overallNote: "Conversa vai continuar mês que vem",
    };

    const outcome = submitAssessment("kadiweu", draft, "Ana Coordenadora");
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;

    const entry = outcome.record.project.healthHistory?.[0];
    expect(entry?.notes).toBe("Emocional: Dormindo mal");
    expect(entry?.notes).not.toContain("d_emotional");
    expect(entry?.notes).not.toContain("Conversa vai continuar");
  });

  it("cada submissão bem-sucedida avança a versão — sem If-Match a checar", () => {
    seeded();
    const draft = {
      ...emptyDraft("kadiweu", NOW),
      ratings: {
        emotional: "boa" as const,
        relational: "boa" as const,
        spiritual: "boa" as const,
        physical: "boa" as const,
      },
    };

    const first = submitAssessment("kadiweu", draft, "Ana");
    const second = submitAssessment("kadiweu", draft, "Ana");
    expect(first.ok && second.ok).toBe(true);
    if (!first.ok || !second.ok) return;
    expect(second.record.version).not.toBe(first.record.version);
    expect(second.record.project.healthHistory).toHaveLength(2);
  });
});
