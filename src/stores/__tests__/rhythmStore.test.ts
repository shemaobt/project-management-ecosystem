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

const { draftKey, migrateRhythm, RHYTHM_VERSION, useRhythmStore } = await import(
  "../rhythmStore"
);

const OCEANIA = "oceania" as const;
const key = draftKey("bimestral_pi_campo", OCEANIA);

const reset = () =>
  useRhythmStore.setState({ log: [], drafts: {}, hydrated: false });

const held = () => useRhythmStore.getState().log;

describe("registrar uma reunião", () => {
  beforeEach(reset);

  it("arquiva sob o período da data informada, não do dia de hoje", () => {
    useRhythmStore
      .getState()
      .logMeeting("bimestral_pi_campo", OCEANIA, "bimonthly", {
        date: "2026-04-20",
        notes: "",
      });

    expect(held()).toEqual([
      {
        meetingId: "bimestral_pi_campo",
        scopeKey: OCEANIA,
        period: "2026-B2",
        date: "2026-04-20",
        notes: "",
      },
    ]);
  });

  it("o trimestral arquiva sob o trimestre da data", () => {
    useRhythmStore
      .getState()
      .logMeeting("trimestral_pi_pontes", OCEANIA, "quarterly", {
        date: "2026-11-30",
        notes: "",
      });

    expect(held()[0].period).toBe("2026-Q4");
  });

  it("registrar de novo no mesmo período corrige, não duplica", () => {
    const { logMeeting } = useRhythmStore.getState();
    logMeeting("bimestral_pi_campo", OCEANIA, "bimonthly", {
      date: "2026-05-04",
      notes: "primeira",
    });
    logMeeting("bimestral_pi_campo", OCEANIA, "bimonthly", {
      date: "2026-05-11",
      notes: "corrigida",
    });

    expect(held()).toHaveLength(1);
    expect(held()[0].date).toBe("2026-05-11");
    expect(held()[0].notes).toBe("corrigida");
  });

  it("períodos diferentes viram entradas diferentes no histórico", () => {
    const { logMeeting } = useRhythmStore.getState();
    logMeeting("bimestral_pi_campo", OCEANIA, "bimonthly", {
      date: "2026-04-20",
      notes: "",
    });
    logMeeting("bimestral_pi_campo", OCEANIA, "bimonthly", {
      date: "2026-05-04",
      notes: "",
    });

    expect(held().map((entry) => entry.period)).toEqual(["2026-B2", "2026-B3"]);
  });

  it("uma data ilegível não entra no histórico", () => {
    useRhythmStore
      .getState()
      .logMeeting("bimestral_pi_campo", OCEANIA, "bimonthly", {
        date: "",
        notes: "sem data",
      });
    useRhythmStore
      .getState()
      .logMeeting("bimestral_pi_campo", OCEANIA, "bimonthly", {
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
    logMeeting("bimestral_pi_campo", OCEANIA, "bimonthly", {
      date: "2026-04-20",
      notes: "",
    });
    logMeeting("bimestral_pi_campo", OCEANIA, "bimonthly", {
      date: "2026-05-04",
      notes: "",
    });

    undoMeeting("bimestral_pi_campo", OCEANIA, "2026-B3");

    expect(held().map((entry) => entry.period)).toEqual(["2026-B2"]);
  });

  it("não toca no registro de outra região", () => {
    const { logMeeting, undoMeeting } = useRhythmStore.getState();
    logMeeting("bimestral_pi_campo", OCEANIA, "bimonthly", {
      date: "2026-05-04",
      notes: "",
    });
    logMeeting("bimestral_pi_campo", "africa", "bimonthly", {
      date: "2026-05-04",
      notes: "",
    });

    undoMeeting("bimestral_pi_campo", OCEANIA, "2026-B3");

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
    logMeeting("bimestral_pi_campo", OCEANIA, "bimonthly", {
      date: "2026-05-04",
      notes: "combinamos revisar o pulso",
    });

    expect(useRhythmStore.getState().drafts[key]).toBeUndefined();
    expect(held()[0].notes).toBe("combinamos revisar o pulso");
  });

  it("o rascunho de uma linha não vaza para outra", () => {
    const other = draftKey("bimestral_pi_campo", "africa");
    useRhythmStore.getState().setDraft(key, { date: "2026-05-04", notes: "oceania" });

    expect(useRhythmStore.getState().drafts[other]).toBeUndefined();
  });

  it("salvar uma linha não apaga o rascunho da outra", () => {
    const other = draftKey("bimestral_pi_campo", "africa");
    const { setDraft, logMeeting } = useRhythmStore.getState();
    setDraft(key, { date: "2026-05-04", notes: "oceania" });
    setDraft(other, { date: "2026-05-04", notes: "africa" });

    logMeeting("bimestral_pi_campo", OCEANIA, "bimonthly", {
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

/**
 * GATE-02 (OBT-388) trocou as cinco reuniões da onda 1 pelas três que existem, e nenhum id
 * antigo sobrevive. O que foi guardado sob eles não é remapeado: `obtlab_team` era trimestral e
 * a bimestral não é a sucessora dele, então mover a entrada poria uma reunião que aconteceu
 * num período ao qual ela nunca pertenceu.
 */
describe("o conjunto do GATE-02 chega a quem já tinha um log guardado", () => {
  it("a versão sobe, e é isso que faz o migrate rodar", () => {
    expect(RHYTHM_VERSION).toBe(2);
  });

  it("descarta o log e os rascunhos dos ids que não existem mais, e só eles", () => {
    const kept = {
      meetingId: "bimestral_pi_campo",
      scopeKey: OCEANIA,
      period: "2026-B5",
      date: "2026-09-10",
      notes: "",
    };
    const migrated = migrateRhythm({
      log: [
        { ...kept, meetingId: "monthly_regional", period: "2026-09" },
        { ...kept, meetingId: "monthly_prayer", period: "2026-09" },
        { ...kept, meetingId: "annual_celebration", scopeKey: "global", period: "2026" },
        kept,
      ],
      drafts: {
        [draftKey("bimestral_pi_campo", OCEANIA)]: { date: "2026-09-10", notes: "fica" },
        "obtlab_team__oceania": { date: "2026-09-10", notes: "sai" },
      },
      hydrated: true,
    });

    expect(migrated.log).toEqual([kept]);
    expect(Object.keys(migrated.drafts)).toEqual([draftKey("bimestral_pi_campo", OCEANIA)]);
    expect(migrated.hydrated).toBe(false);
  });

  it("um arquivo ilegível migra para vazio, sem quebrar a tela", () => {
    expect(migrateRhythm(null)).toEqual({ log: [], drafts: {}, hydrated: false });
    expect(migrateRhythm({ log: "x", drafts: null })).toEqual({
      log: [],
      drafts: {},
      hydrated: false,
    });
  });
});
