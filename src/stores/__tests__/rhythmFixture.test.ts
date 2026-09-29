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

const { MOCK_SESSION_KEY } = await import("../../fixtures/session");
const { RITMO_MEETINGS } = await import("../../constants/meetings");
const { meetingStatus } = await import("../../utils/rhythm");
const { useRhythmStore } = await import("../rhythmStore");

/**
 * Fixture mode stands in for the server (§4.1): the double derives the period and gives the
 * refusals `shema-api` gives, so the screen that works here is the screen that works there.
 */
const meeting = (id: string) => {
  const found = RITMO_MEETINGS.find((entry) => entry.id === id);
  if (!found) throw new Error(`no meeting ${id}`);
  return found;
};

const asRole = (role: string) => storage.setItem(MOCK_SESSION_KEY, role);

beforeEach(() => {
  storage.clear();
  useRhythmStore.setState({
    log: [],
    drafts: {},
    forbidden: false,
    hydrated: false,
    loading: false,
    error: null,
  });
});

describe("as cadências novas funcionam ponta a ponta", () => {
  it("a bimestral registrada em 1º de março fica em dia no segundo bimestre", async () => {
    const outcome = await useRhythmStore
      .getState()
      .logMeeting("bimestral_pi_campo", "africa", { date: "2026-03-01", notes: "" });

    expect(outcome).toEqual({ status: "saved" });
    const log = useRhythmStore.getState().log;
    expect(log.map((entry) => entry.period)).toEqual(["2026-B2"]);
    expect(
      meetingStatus(log, meeting("bimestral_pi_campo"), "africa", new Date(2026, 3, 30)),
    ).toEqual({ state: "done", date: "2026-03-01" });
    expect(
      meetingStatus(log, meeting("bimestral_pi_campo"), "africa", new Date(2026, 4, 1)).state,
    ).toBe("pending");
  });

  it("a semestral registrada em 1º de julho cobre o segundo semestre inteiro", async () => {
    await useRhythmStore
      .getState()
      .logMeeting("semestral_member_care", "africa", { date: "2026-07-01", notes: "" });

    const log = useRhythmStore.getState().log;
    expect(log.map((entry) => entry.period)).toEqual(["2026-H2"]);
    expect(
      meetingStatus(log, meeting("semestral_member_care"), "africa", new Date(2026, 11, 31))
        .state,
    ).toBe("done");
    expect(
      meetingStatus(log, meeting("semestral_member_care"), "africa", new Date(2027, 0, 1))
        .state,
    ).toBe("pending");
  });

  it("desfazer tira a linha de em dia", async () => {
    const { logMeeting } = useRhythmStore.getState();
    await logMeeting("trimestral_pi_pontes", "africa", { date: "2026-11-30", notes: "" });
    await useRhythmStore.getState().undoMeeting("trimestral_pi_pontes", "africa", "2026-Q4");

    expect(useRhythmStore.getState().log).toEqual([]);
  });
});

describe("o escopo é o do servidor, também no dublê", () => {
  it("o Círculo de Recursos não lê o log, e a tela sabe que não é falha", async () => {
    asRole("resourceCircle");

    await useRhythmStore.getState().reload();

    expect(useRhythmStore.getState().forbidden).toBe(true);
    expect(useRhythmStore.getState().error).toBeNull();
  });

  it("nem grava nele", async () => {
    asRole("resourceCircle");

    const outcome = await useRhythmStore
      .getState()
      .logMeeting("bimestral_pi_campo", "oceania", { date: "2026-03-01", notes: "" });

    expect(outcome.status).toBe("failed");
    expect(useRhythmStore.getState().log).toEqual([]);
  });

  it("uma região fora do escopo de quem registra é recusada", async () => {
    asRole("coordinator");

    const outcome = await useRhythmStore
      .getState()
      .logMeeting("bimestral_pi_campo", "africa", { date: "2026-03-01", notes: "" });

    expect(outcome).toMatchObject({ status: "failed", failure: { kind: "forbidden" } });
  });

  it("um dia que não é dia é recusado, como o servidor recusa", async () => {
    const outcome = await useRhythmStore
      .getState()
      .logMeeting("bimestral_pi_campo", "africa", { date: "20/04/2026", notes: "" });

    expect(outcome).toMatchObject({ status: "failed", failure: { kind: "invalid" } });
  });
});
