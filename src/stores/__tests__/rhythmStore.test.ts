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
  };
}

const storage = createMemoryStorage();
vi.stubGlobal("localStorage", storage);
vi.stubGlobal("window", { localStorage: storage });

const { draftKey, useRhythmStore } = await import("../rhythmStore");

const OCEANIA = "oceania" as const;
const key = draftKey("monthly_regional", OCEANIA);

const reset = () =>
  useRhythmStore.setState({ log: [], drafts: {}, hydrated: false });

const held = () => useRhythmStore.getState().log;

describe("registrar uma reunião", () => {
  beforeEach(reset);

  it("arquiva sob o período da data informada, não do dia de hoje", () => {
    useRhythmStore
      .getState()
      .logMeeting("monthly_regional", OCEANIA, "monthly", {
        date: "2026-04-20",
        notes: "",
      });

    expect(held()).toEqual([
      {
        meetingId: "monthly_regional",
        scopeKey: OCEANIA,
        period: "2026-04",
        date: "2026-04-20",
        notes: "",
      },
    ]);
  });

  it("o trimestral arquiva sob o trimestre da data", () => {
    useRhythmStore
      .getState()
      .logMeeting("obtlab_team", OCEANIA, "quarterly", {
        date: "2026-11-30",
        notes: "",
      });

    expect(held()[0].period).toBe("2026-Q4");
  });

  it("registrar de novo no mesmo período corrige, não duplica", () => {
    const { logMeeting } = useRhythmStore.getState();
    logMeeting("monthly_regional", OCEANIA, "monthly", {
      date: "2026-05-04",
      notes: "primeira",
    });
    logMeeting("monthly_regional", OCEANIA, "monthly", {
      date: "2026-05-11",
      notes: "corrigida",
    });

    expect(held()).toHaveLength(1);
    expect(held()[0].date).toBe("2026-05-11");
    expect(held()[0].notes).toBe("corrigida");
  });

  it("períodos diferentes viram entradas diferentes no histórico", () => {
    const { logMeeting } = useRhythmStore.getState();
    logMeeting("monthly_regional", OCEANIA, "monthly", {
      date: "2026-04-20",
      notes: "",
    });
    logMeeting("monthly_regional", OCEANIA, "monthly", {
      date: "2026-05-04",
      notes: "",
    });

    expect(held().map((entry) => entry.period)).toEqual(["2026-04", "2026-05"]);
  });

  it("uma data ilegível não entra no histórico", () => {
    useRhythmStore
      .getState()
      .logMeeting("monthly_regional", OCEANIA, "monthly", {
        date: "",
        notes: "sem data",
      });
    useRhythmStore
      .getState()
      .logMeeting("monthly_regional", OCEANIA, "monthly", {
        date: "20/04/2026",
        notes: "formato do campo",
      });

    expect(held()).toEqual([]);
  });
});

describe("desfazer", () => {
  beforeEach(reset);

  it("remove só a entrada daquele período", () => {
    const { logMeeting, undoMeeting } = useRhythmStore.getState();
    logMeeting("monthly_regional", OCEANIA, "monthly", {
      date: "2026-04-20",
      notes: "",
    });
    logMeeting("monthly_regional", OCEANIA, "monthly", {
      date: "2026-05-04",
      notes: "",
    });

    undoMeeting("monthly_regional", OCEANIA, "2026-05");

    expect(held().map((entry) => entry.period)).toEqual(["2026-04"]);
  });

  it("não toca no registro de outra região", () => {
    const { logMeeting, undoMeeting } = useRhythmStore.getState();
    logMeeting("monthly_regional", OCEANIA, "monthly", {
      date: "2026-05-04",
      notes: "",
    });
    logMeeting("monthly_regional", "africa", "monthly", {
      date: "2026-05-04",
      notes: "",
    });

    undoMeeting("monthly_regional", OCEANIA, "2026-05");

    expect(held().map((entry) => entry.scopeKey)).toEqual(["africa"]);
  });
});

describe("uma nota digitada não se perde ao fechar", () => {
  beforeEach(reset);

  it("fechar o diálogo não apaga o rascunho", () => {
    useRhythmStore
      .getState()
      .setDraft(key, { date: "2026-05-04", notes: "combinamos revisar o pulso" });

    expect(useRhythmStore.getState().drafts[key]).toEqual({
      date: "2026-05-04",
      notes: "combinamos revisar o pulso",
    });
  });

  it("salvar consome o rascunho daquela linha", () => {
    const { setDraft, logMeeting } = useRhythmStore.getState();
    setDraft(key, { date: "2026-05-04", notes: "combinamos revisar o pulso" });
    logMeeting("monthly_regional", OCEANIA, "monthly", {
      date: "2026-05-04",
      notes: "combinamos revisar o pulso",
    });

    expect(useRhythmStore.getState().drafts[key]).toBeUndefined();
    expect(held()[0].notes).toBe("combinamos revisar o pulso");
  });

  it("o rascunho de uma linha não vaza para outra", () => {
    const other = draftKey("monthly_regional", "africa");
    useRhythmStore.getState().setDraft(key, { date: "2026-05-04", notes: "oceania" });

    expect(useRhythmStore.getState().drafts[other]).toBeUndefined();
  });

  it("salvar uma linha não apaga o rascunho da outra", () => {
    const other = draftKey("monthly_regional", "africa");
    const { setDraft, logMeeting } = useRhythmStore.getState();
    setDraft(key, { date: "2026-05-04", notes: "oceania" });
    setDraft(other, { date: "2026-05-04", notes: "africa" });

    logMeeting("monthly_regional", OCEANIA, "monthly", {
      date: "2026-05-04",
      notes: "oceania",
    });

    expect(useRhythmStore.getState().drafts[other]).toEqual({
      date: "2026-05-04",
      notes: "africa",
    });
  });

  it("descartar é explícito", () => {
    const { setDraft, clearDraft } = useRhythmStore.getState();
    setDraft(key, { date: "2026-05-04", notes: "some" });
    clearDraft(key);

    expect(useRhythmStore.getState().drafts[key]).toBeUndefined();
  });
});
