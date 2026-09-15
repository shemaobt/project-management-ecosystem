import { beforeEach, describe, expect, it } from "vitest";
import { createEmptyProject } from "../../fixtures";
import { emptyDraft } from "../../utils/assessment";

const { useProjectRecordStore } = await import("../projectRecordStore");
const { projectRecordAPI } = await import("../../services/api");

const NOW = new Date(2026, 4, 14);

beforeEach(() => {
  useProjectRecordStore.getState().forget();
});

const assessed = (id: string) => ({
  ...emptyDraft(id, NOW),
  ratings: {
    emotional: "boa" as const,
    relational: "boa" as const,
    spiritual: "boa" as const,
    physical: "boa" as const,
  },
});

describe("useProjectRecordStore.submitAssessment — a costura da INT-04", () => {
  it("sem registro aberto, recusa sem tentar a rede", async () => {
    const outcome = await useProjectRecordStore
      .getState()
      .submitAssessment(assessed("prs-none"), "Ana");

    expect(outcome.kind).toBe("failed");
  });

  it("uma submissão aceita substitui o registro pelo que o servidor devolveu", async () => {
    await projectRecordAPI.create({
      ...createEmptyProject("prs-saved"),
      languageName: "Kadiwéu",
    });
    await useProjectRecordStore.getState().open("prs-saved");

    const outcome = await useProjectRecordStore
      .getState()
      .submitAssessment(assessed("prs-saved"), "Ana Coordenadora");

    expect(outcome.kind).toBe("saved");
    if (outcome.kind !== "saved") return;
    expect(outcome.project.healthEmotional).toBe("boa");

    const { record } = useProjectRecordStore.getState();
    expect(record?.project.healthEmotional).toBe("boa");
    expect(record?.project.healthHistory?.[0]?.author).toBe("Ana Coordenadora");
  });

  it("uma recusa não troca o registro que já estava carregado", async () => {
    await projectRecordAPI.create({
      ...createEmptyProject("prs-untouched"),
      languageName: "Kadiwéu",
    });
    await useProjectRecordStore.getState().open("prs-untouched");
    const before = useProjectRecordStore.getState().record;

    // `submitAssessment` files against whatever id is currently open (`get().id`), not
    // against `draft.projectId` — this points the open id at one the double has never
    // heard of, without going through `open()` (which would itself set `loadError`).
    // What this proves is `submitAssessment`'s own promise: a refused submission never
    // touches `record`, no matter what the currently open id turns out to be.
    useProjectRecordStore.setState({ id: "prs-ghost-does-not-exist" });
    const outcome = await useProjectRecordStore
      .getState()
      .submitAssessment(assessed("prs-ghost-does-not-exist"), "Ana");

    expect(outcome.kind).toBe("invalid");
    expect(useProjectRecordStore.getState().record).toBe(before);
  });

  it("não mexe em `saving`/`outcome` — são do salvamento da ficha, não do wizard", async () => {
    await projectRecordAPI.create({
      ...createEmptyProject("prs-isolated"),
      languageName: "Kadiwéu",
    });
    await useProjectRecordStore.getState().open("prs-isolated");

    await useProjectRecordStore
      .getState()
      .submitAssessment(assessed("prs-isolated"), "Ana");

    expect(useProjectRecordStore.getState().saving).toBe(false);
    expect(useProjectRecordStore.getState().outcome).toBeNull();
  });
});
