import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CURRENT_QUESTION_SET_VERSION } from "../../constants/health";
import type { AssessmentDraft } from "../../types/assessment";
import { emptyDraft } from "../../utils/assessment";
import { createEmptyProject } from "../blank";
import {
  createRecord,
  patchRecord,
  readRecord,
  resetRecordOverlay,
  submitAssessment,
} from "../projectRecord";
import { loadProjects } from "../projects";
import { getRegion } from "../../utils/region";
import { MOCK_SESSION_KEY } from "../session";

const stored = new Map<string, string>();
vi.stubGlobal("localStorage", {
  getItem: (key: string) => stored.get(key) ?? null,
  setItem: (key: string, value: string) => void stored.set(key, value),
  removeItem: (key: string) => void stored.delete(key),
});

afterEach(() => stored.clear());

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

  it("uma retroativa depois de uma atual com pastoral sim deixa os três campos onde estavam, como o servidor (OBT-623)", () => {
    seeded();
    const reading = (date: string, over: Partial<AssessmentDraft> = {}): AssessmentDraft => ({
      ...emptyDraft("kadiweu", NOW),
      date,
      ratings: { emotional: "atencao", relational: "", spiritual: "", physical: "" },
      ...over,
    });

    submitAssessment(
      "kadiweu",
      reading("2026-10-26", {
        pastoral: "sim",
        pastoralWho: "Daniel — visita de campo em junho",
        pastoralWhen: "30d",
      }),
      "Ana",
    );
    const outcome = submitAssessment(
      "kadiweu",
      reading("2026-08-15", {
        ratings: { emotional: "critica", relational: "", spiritual: "", physical: "" },
      }),
      "Ana",
    );

    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    const { project } = outcome.record;
    expect(project.needsPastoralIntervention).toBe("sim");
    expect(project.pastoralInterventionName).toBe("Daniel — visita de campo em junho");
    expect(project.pastoralInterventionWhen).toBe("30d");
    expect(project.healthHistory?.map((entry) => entry.date)).toEqual([
      "2026-08-15",
      "2026-10-26",
    ]);
  });
});

describe("o dublê da ficha responde ao leitor como o servidor (OBT-528)", () => {
  const sensitive = () => loadProjects().find((project) => project.sensitiveCountry)!;

  it("recusa o que o servidor recusa a quem não é coordenação", () => {
    const truth = sensitive();
    stored.set(MOCK_SESSION_KEY, "obtLab");
    const { version } = readRecord(truth.id);
    for (const field of ["location", "sensitiveCountry", "team", "mentorContact"]) {
      const outcome = patchRecord(truth.id, { [field]: "x" }, version);
      expect(outcome.ok, field).toBe(false);
      if (!outcome.ok && outcome.reason === "failed") {
        expect(outcome.failure.kind).toBe("forbidden");
      }
    }
    expect(patchRecord(truth.id, { mentor: "segue" }, version).ok).toBe(true);
  });

  it("o overlay nunca guarda a forma reduzida", () => {
    const truth = sensitive();
    stored.set(MOCK_SESSION_KEY, "obtLab");
    const { version } = readRecord(truth.id);
    const saved = patchRecord(truth.id, { mentor: "segue" }, version);
    expect(saved.ok && saved.record.project.team).toBe("");

    stored.set(MOCK_SESSION_KEY, "admin");
    const reread = readRecord(truth.id).project;
    expect(reread.readAs).toBe("coordination");
    expect(reread.team).toBe(truth.team);
    expect(reread.location).toBe(truth.location);
  });
});

describe("o dublê da ficha recusa o texto livre e o pastoral como o servidor (OBT-553, OBT-556)", () => {
  const withNeed = () => {
    stored.set(MOCK_SESSION_KEY, "admin");
    const created = createRecord({
      ...createEmptyProject("sintetico"),
      languageName: "Sintético",
      // In the OBT Lab persona's region, so what is refused is the free text and not the record.
      location: "Egypt, Vila Sintética",
      sensitiveCountry: true,
      needsItems: [
        { id: "n1", category: "equipment", urgency: "low", status: "open", description: "Precisamos de gravadores" },
        { id: "n2", category: "equipment", urgency: "low", status: "open", description: "Precisamos de fones" },
      ],
    });
    expect(created.ok).toBe(true);
    return loadSeeded("sintetico");
  };
  // The OBT Lab persona writes in Africa (its `writeRegionScope`, OBT-593): the withheld record
  // it is refused free text on has to be one it writes at all — Egypt, not Mexico.
  const sensitive = () =>
    loadProjects().find((project) => project.sensitiveCountry && getRegion(project) === "africa")!;
  const open = () => loadProjects().find((project) => !project.sensitiveCountry)!;

  const loadSeeded = (id: string) => {
    stored.set(MOCK_SESSION_KEY, "admin");
    return readRecord(id).project;
  };

  const refusedField = (outcome: ReturnType<typeof patchRecord>) =>
    !outcome.ok && outcome.reason === "failed" ? outcome.failure.detail : null;

  it("o texto livre de um registro recolhido é recusado nomeando o campo", () => {
    const truth = sensitive();
    stored.set(MOCK_SESSION_KEY, "obtLab");
    const { version } = readRecord(truth.id);
    for (const field of ["notes", "healthNotes", "statusComments", "scopeDetails"]) {
      const outcome = patchRecord(truth.id, { [field]: "x" }, version);
      expect(refusedField(outcome), field).toContain(field);
    }
  });

  it("o mesmo texto, num registro aberto, é aceito", () => {
    const truth = open();
    stored.set(MOCK_SESSION_KEY, "obtLab");
    const { version } = readRecord(truth.id);
    expect(patchRecord(truth.id, { notes: "segue" }, version).ok).toBe(true);
  });

  it("a descrição devolvida vazia não muda nada; digitada por cima é recusada", () => {
    const truth = withNeed();
    stored.set(MOCK_SESSION_KEY, "obtLab");
    const { version, project } = readRecord(truth.id);
    expect(project.needsItems.every((need) => need.description === "")).toBe(true);

    const back = project.needsItems.map((need) => ({ ...need }));
    const kept = patchRecord(truth.id, { needsItems: back }, version);
    expect(kept.ok).toBe(true);

    const typedOver = project.needsItems.map((need, index) =>
      index === 0 ? { ...need, description: "por cima" } : need,
    );
    const refused = patchRecord(truth.id, { needsItems: typedOver }, readRecord(truth.id).version);
    expect(refusedField(refused)).toContain("needsItems.description");

    stored.set(MOCK_SESSION_KEY, "admin");
    const after = readRecord(truth.id).project;
    expect(after.needsItems.map((need) => need.description)).toEqual(
      truth.needsItems.map((need) => need.description),
    );
  });

  it("o pastoral é recusado a quem não lê saúde e aceito a quem lê", () => {
    const truth = open();
    stored.set(MOCK_SESSION_KEY, "resourceCircle");
    const { version } = readRecord(truth.id);
    for (const field of ["needsPastoralIntervention", "pastoralInterventionName", "pastoralInterventionWhen"]) {
      const outcome = patchRecord(truth.id, { [field]: "sim" }, version);
      expect(refusedField(outcome), field).toContain(field);
    }

    stored.set(MOCK_SESSION_KEY, "obtLab");
    const readable = readRecord(truth.id);
    expect(patchRecord(truth.id, { needsPastoralIntervention: "sim" }, readable.version).ok).toBe(true);
  });
});
