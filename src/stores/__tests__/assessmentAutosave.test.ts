import { beforeEach, describe, expect, it, vi } from "vitest";

function createMemoryStorage() {
  const data = new Map<string, string>();
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => {
      data.set(key, value);
    },
    removeItem: (key: string) => {
      data.delete(key);
    },
    clear: () => data.clear(),
    raw: data,
  };
}

const storage = createMemoryStorage();
vi.stubGlobal("localStorage", storage);
vi.stubGlobal("window", { localStorage: storage });

const { useAssessmentStore, ASSESSMENTS_VERSION } = await import(
  "../assessmentStore"
);
const { emptyDraft } = await import("../../utils/assessment");

const NOW = new Date(2026, 4, 14);

beforeEach(() => {
  useAssessmentStore.setState({ drafts: {} });
  storage.clear();
});

function answerTwoDimensions() {
  const store = useAssessmentStore.getState();
  const first = {
    ...store.draftFor("kadiweu", NOW),
    ratings: {
      emotional: "atencao" as const,
      relational: "" as const,
      spiritual: "" as const,
      physical: "" as const,
    },
    notes: {
      emotional: "Dormindo mal desde a enchente.",
      relational: "",
      spiritual: "",
      physical: "",
    },
  };
  store.saveStep(first, NOW);

  const second = {
    ...useAssessmentStore.getState().draftFor("kadiweu", NOW),
    ratings: {
      emotional: "atencao" as const,
      relational: "critica" as const,
      spiritual: "" as const,
      physical: "" as const,
    },
    notes: {
      emotional: "Dormindo mal desde a enchente.",
      relational: "Dois deles não se falam há um mês.",
      spiritual: "",
      physical: "",
    },
  };
  useAssessmentStore.getState().saveStep(second, NOW);
}

describe("cair no meio da conversa não custa a conversa de novo", () => {
  it("cada passo é guardado no armazenamento, não só em memória", () => {
    answerTwoDimensions();

    const raw = storage.getItem("shema-assessments-v1");
    expect(raw).not.toBeNull();
    expect(raw).toContain("Dois deles não se falam há um mês.");
  });

  it("uma sessão nova, lendo o que ficou guardado, recupera as duas dimensões", () => {
    answerTwoDimensions();
    const persisted = JSON.parse(
      storage.getItem("shema-assessments-v1") ?? "{}",
    ) as { state: { drafts: Record<string, unknown> }; version: number };

    useAssessmentStore.setState({ drafts: {} });
    expect(useAssessmentStore.getState().draftFor("kadiweu", NOW).notes)
      .toEqual({ emotional: "", relational: "", spiritual: "", physical: "" });

    useAssessmentStore.setState({
      drafts: persisted.state.drafts as never,
    });
    const resumed = useAssessmentStore.getState().draftFor("kadiweu", NOW);

    expect(persisted.version).toBe(ASSESSMENTS_VERSION);
    expect(resumed.ratings.emotional).toBe("atencao");
    expect(resumed.ratings.relational).toBe("critica");
    expect(resumed.notes.emotional).toBe("Dormindo mal desde a enchente.");
    expect(resumed.notes.relational).toBe("Dois deles não se falam há um mês.");
  });

  it("o que ainda não foi conversado continua não avaliado ao retomar", () => {
    answerTwoDimensions();
    const resumed = useAssessmentStore.getState().draftFor("kadiweu", NOW);

    expect(resumed.ratings.spiritual).toBe("");
    expect(resumed.ratings.physical).toBe("");
  });

  it("o rascunho de um projeto não vaza para o de outro", () => {
    answerTwoDimensions();

    expect(
      useAssessmentStore.getState().draftFor("baikeno", NOW).ratings.emotional,
    ).toBe("");
  });

  it("descartar apaga o rascunho daquele projeto e só dele", () => {
    answerTwoDimensions();
    useAssessmentStore
      .getState()
      .saveStep(
        { ...emptyDraft("baikeno", NOW), assessor: "Ana" },
        NOW,
      );

    useAssessmentStore.getState().discardDraft("kadiweu");

    expect(useAssessmentStore.getState().drafts["kadiweu"]).toBeUndefined();
    expect(useAssessmentStore.getState().drafts["baikeno"]?.assessor).toBe(
      "Ana",
    );
  });

  it("cada passo carimba quando foi guardado", () => {
    answerTwoDimensions();

    expect(useAssessmentStore.getState().drafts["kadiweu"]?.savedAt).toBe(
      "2026-05-14",
    );
  });
});
