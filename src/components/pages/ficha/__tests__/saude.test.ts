import { readFileSync } from "node:fs";
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

const { projectsAPI, prayerAPI } = await import("../../../../fixtures");
const { buildPrayerRequests } = await import("../../../../utils/prayer");
const { HEALTH_DIMENSIONS, HEALTH_DIMENSION_KEYS } = await import(
  "../../../../constants/health"
);
const { HEALTH_LEVELS, OVERALL_HEALTH_STATES } = await import(
  "../../../../constants/project"
);
const { HEALTH_SYMBOLS } = await import("../../../../constants/status");
const { PRAYER_VISIBILITIES, DEFAULT_PRAYER_VISIBILITY } = await import(
  "../../../../constants/prayer"
);
const {
  assessmentHistory,
  currentAssessment,
  dimensionRating,
  getOverallHealth,
  isAssessed,
  recordAssessment,
} = await import("../../../../utils/health");
const { getPrayerVisibility, reachesPrayerWall } = await import(
  "../../../../utils/prayer"
);
const { useRecordStore, NEW_RECORD, makeEmptyProject } = await import(
  "../../../../stores/recordStore"
);
const { makeProject } = await import("../../../../utils/__tests__/factory");

const projects = await projectsAPI.list();

const prototype = readFileSync("DS-PROJECT/health-modal.jsx", "utf8");
const dataJs = readFileSync("DS-PROJECT/data.js", "utf8");

const assessment = (over: Partial<Record<string, string>> = {}) => ({
  date: "2026-03-01",
  assessor: "Coordenação",
  emotional: "boa" as const,
  relational: "boa" as const,
  spiritual: "boa" as const,
  physical: "boa" as const,
  notes: "",
  ...over,
});

beforeEach(() => {
  storage.clear();
  useRecordStore.setState({ drafts: {} });
});

describe("quatro dimensões e três notas, como o protótipo fixou", () => {
  it("as quatro dimensões são as do health-modal, na mesma ordem", () => {
    expect(HEALTH_DIMENSION_KEYS).toEqual([
      "emotional",
      "relational",
      "spiritual",
      "physical",
    ]);

    const order = [...prototype.matchAll(/key: '(health\w+)'/gu)].map(
      (match) => match[1],
    );
    expect(HEALTH_DIMENSIONS.map((dimension) => dimension.field)).toEqual(order);
  });

  it("as três notas são as do data.js, e nada mais", () => {
    expect(HEALTH_LEVELS).toEqual(["boa", "atencao", "critica"]);
    expect(dataJs).toContain("v === 'critica'");
    expect(dataJs).toContain("v === 'atencao'");
    expect(OVERALL_HEALTH_STATES).toContain("na");
  });

  it("cada dimensão traz a pergunta pastoral do protótipo", () => {
    for (const dimension of HEALTH_DIMENSIONS) {
      expect(dimension.questionKey.startsWith("health_q_")).toBe(true);
    }
    expect(new Set(HEALTH_DIMENSIONS.map((d) => d.questionKey)).size).toBe(4);
  });

  it("a saúde geral é a pior das quatro, como o data.js deriva", () => {
    expect(getOverallHealth(makeProject())).toBe("na");
    expect(
      getOverallHealth(makeProject({ healthEmotional: "boa" })),
    ).toBe("boa");
    expect(
      getOverallHealth(
        makeProject({ healthEmotional: "boa", healthRelational: "atencao" }),
      ),
    ).toBe("atencao");
    expect(
      getOverallHealth(
        makeProject({ healthEmotional: "atencao", healthPhysical: "critica" }),
      ),
    ).toBe("critica");
  });
});

describe("não avaliado não é boa", () => {
  it("os 127 registros reais chegam sem nenhuma dimensão avaliada", () => {
    const assessed = projects.filter((project) => isAssessed(project));
    expect(assessed).toHaveLength(0);
    for (const project of projects) {
      expect(getOverallHealth(project)).toBe("na");
    }
  });

  it("uma dimensão em branco não conta como boa em lugar nenhum", () => {
    const partial = makeProject({
      healthEmotional: "boa",
      healthRelational: "",
      healthSpiritual: "",
      healthPhysical: "",
    });
    expect(getOverallHealth(partial)).toBe("boa");
    for (const dimension of HEALTH_DIMENSIONS.slice(1)) {
      expect(dimensionRating(partial, dimension)).toBe("");
    }
  });

  it("na tem símbolo próprio, distinto dos três", () => {
    expect(HEALTH_SYMBOLS.na).toBeTruthy();
    expect(HEALTH_SYMBOLS.na).not.toBe(HEALTH_SYMBOLS.boa);
    expect(new Set(Object.values(HEALTH_SYMBOLS)).size).toBe(
      OVERALL_HEALTH_STATES.length,
    );
  });

  it("uma ficha nova nasce não avaliada", () => {
    expect(isAssessed(makeEmptyProject())).toBe(false);
    expect(currentAssessment(makeEmptyProject())).toBeNull();
  });
});

describe("uma avaliação nova nunca apaga a anterior", () => {
  it("guarda as duas e projeta a mais recente", () => {
    const first = assessment({ date: "2026-01-10", emotional: "atencao" });
    const second = assessment({ date: "2026-04-10", emotional: "critica" });

    const once = recordAssessment(makeProject(), first);
    const twice = recordAssessment(once, second);

    expect(assessmentHistory(twice)).toHaveLength(2);
    expect(assessmentHistory(twice)[0].date).toBe("2026-01-10");
    expect(currentAssessment(twice)?.date).toBe("2026-04-10");
    expect(twice.healthEmotional).toBe("critica");
    expect(getOverallHealth(twice)).toBe("critica");
  });

  it("três avaliações seguidas guardam três linhas", () => {
    let project = makeProject();
    for (const date of ["2026-01-10", "2026-04-10", "2026-07-10"]) {
      project = recordAssessment(project, assessment({ date }));
    }
    expect(assessmentHistory(project).map((entry) => entry.date)).toEqual([
      "2026-01-10",
      "2026-04-10",
      "2026-07-10",
    ]);
  });

  it("uma avaliação anterior aos campos planos não é perdida", () => {
    const legacy = makeProject({
      healthEmotional: "atencao",
      healthRelational: "boa",
      healthSpiritual: "boa",
      healthPhysical: "boa",
      healthAssessmentDate: "2025-11-02",
      healthAssessor: "Mentor antigo",
    });
    expect(legacy.healthHistory).toBeUndefined();

    const next = recordAssessment(legacy, assessment({ date: "2026-05-02" }));
    const history = assessmentHistory(next);

    expect(history).toHaveLength(2);
    expect(history[0].date).toBe("2025-11-02");
    expect(history[0].assessor).toBe("Mentor antigo");
    expect(history[0].emotional).toBe("atencao");
  });

  it("uma data sozinha não é avaliação e não vira linha do histórico", () => {
    const seeded = projects.find((project) => project.id === "ashaninka");
    if (!seeded) throw new Error("ashaninka saiu das fixtures");

    expect(seeded.healthAssessmentDate).toBe("2026-05-14");
    expect(isAssessed(seeded)).toBe(false);
    expect(currentAssessment(seeded)).toBeNull();

    const first = recordAssessment(seeded, assessment({ date: "2026-08-01" }));
    expect(assessmentHistory(first)).toHaveLength(1);
    expect(assessmentHistory(first)[0].date).toBe("2026-08-01");
  });

  it("a data semeada não sobrescreve a primeira conversa retroativa", () => {
    const seeded = projects.find((project) => project.id === "ashaninka");
    if (!seeded) throw new Error("ashaninka saiu das fixtures");

    const backdated = recordAssessment(
      seeded,
      assessment({ date: "2026-01-01", emotional: "boa" }),
    );

    expect(backdated.healthEmotional).toBe("boa");
    expect(backdated.healthAssessmentDate).toBe("2026-01-01");
    expect(assessmentHistory(backdated)).toHaveLength(1);
  });

  it("nenhuma das 127 fixtures gera avaliação a partir da data", () => {
    for (const project of projects) {
      expect(currentAssessment(project)).toBeNull();
    }
  });

  it("uma avaliação retroativa entra no lugar certo sem virar a atual", () => {
    const current = recordAssessment(
      makeProject(),
      assessment({ date: "2026-06-01", emotional: "boa" }),
    );
    const backfilled = recordAssessment(
      current,
      assessment({ date: "2026-02-01", emotional: "critica" }),
    );

    expect(assessmentHistory(backfilled).map((entry) => entry.date)).toEqual([
      "2026-02-01",
      "2026-06-01",
    ]);
    expect(backfilled.healthEmotional).toBe("boa");
    expect(currentAssessment(backfilled)?.date).toBe("2026-06-01");
  });

  it("os campos planos e a última linha do histórico nunca divergem", () => {
    let project = makeProject();
    for (const [date, emotional] of [
      ["2026-01-10", "boa"],
      ["2026-04-10", "atencao"],
      ["2026-07-10", "critica"],
    ] as const) {
      project = recordAssessment(project, assessment({ date, emotional }));
      const newest = currentAssessment(project);
      expect(project.healthEmotional).toBe(newest?.emotional);
      expect(project.healthAssessmentDate).toBe(newest?.date);
      expect(project.healthAssessor).toBe(newest?.assessor);
    }
  });
});

describe("o pedido de oração só sai com autorização", () => {
  it("sem nada dito, fica só com a coordenação", () => {
    const silent = makeProject({ prayerRequests: "Orem pela equipe." });
    expect(silent.prayerVisibility).toBeUndefined();
    expect(getPrayerVisibility(silent)).toBe(DEFAULT_PRAYER_VISIBILITY);
    expect(DEFAULT_PRAYER_VISIBILITY).toBe("coordenacao");
    expect(reachesPrayerWall(silent)).toBe(false);
  });

  it("é nível de visibilidade, não um booleano de publicado", () => {
    expect(PRAYER_VISIBILITIES).toEqual(["coordenacao", "rede"]);
    expect(
      reachesPrayerWall(makeProject({ prayerVisibility: "coordenacao" })),
    ).toBe(false);
    expect(reachesPrayerWall(makeProject({ prayerVisibility: "rede" }))).toBe(
      true,
    );
  });

  it("o mural não devolve o pedido que não foi autorizado", async () => {
    const requests = await prayerAPI.list();
    const withheld = projects.filter(
      (project) => project.prayerRequests.trim() && !reachesPrayerWall(project),
    );

    expect(withheld.length).toBeGreaterThan(0);
    for (const project of withheld) {
      expect(requests.some((request) => request.projectId === project.id)).toBe(
        false,
      );
    }
  });

  it("as fixtures trazem os dois estados, não só o autorizado", async () => {
    const withText = projects.filter((project) =>
      project.prayerRequests.trim(),
    );
    const shared = withText.filter((project) => reachesPrayerWall(project));

    expect(shared.length).toBeGreaterThan(0);
    expect(withText.length).toBeGreaterThan(shared.length);
    expect(await prayerAPI.list()).toHaveLength(shared.length);
  });

  it("retirar a autorização tira o pedido do mural", () => {
    const shared = makeProject({
      id: "x",
      prayerRequests: "Orem pela equipe.",
      prayerVisibility: "rede",
    });
    expect(reachesPrayerWall(shared)).toBe(true);
    expect(
      reachesPrayerWall({ ...shared, prayerVisibility: "coordenacao" }),
    ).toBe(false);
  });

  it("o mural é derivado, não guardado: retirar some sem faxina", async () => {
    const shared = projects.filter((project) => reachesPrayerWall(project));
    expect(shared.length).toBeGreaterThan(0);

    const target = shared[0];
    const withdrawn = projects.map((project) =>
      project.id === target.id
        ? { ...project, prayerVisibility: "coordenacao" as const }
        : project,
    );

    const before = buildPrayerRequests(projects);
    const after = buildPrayerRequests(withdrawn);

    expect(before.map((request) => request.projectId)).toContain(target.id);
    expect(after.map((request) => request.projectId)).not.toContain(target.id);
    expect(after).toHaveLength(before.length - 1);
  });

  it("retirar a autorização não apaga o texto do registro", () => {
    const shared = makeProject({
      prayerRequests: "Orem pela equipe.",
      prayerVisibility: "rede",
    });
    const withdrawn = { ...shared, prayerVisibility: "coordenacao" as const };

    expect(reachesPrayerWall(withdrawn)).toBe(false);
    expect(withdrawn.prayerRequests).toBe("Orem pela equipe.");
  });

  it("o rascunho guarda a visibilidade escolhida", () => {
    const { updateDraft } = useRecordStore.getState();
    updateDraft(NEW_RECORD, { prayerVisibility: "rede" });
    expect(useRecordStore.getState().drafts[NEW_RECORD].prayerVisibility).toBe(
      "rede",
    );
  });
});

describe("a intervenção pastoral é campo do registro, não sub-painel", () => {
  it("nasce em não e persiste em sim", () => {
    expect(makeEmptyProject().needsPastoralIntervention).toBe("nao");

    const { updateDraft } = useRecordStore.getState();
    updateDraft("p1", {
      needsPastoralIntervention: "sim",
      pastoralInterventionName: "Pastor local",
    });

    const draft = useRecordStore.getState().drafts["p1"];
    expect(draft.needsPastoralIntervention).toBe("sim");
    expect(draft.pastoralInterventionName).toBe("Pastor local");
  });

  it("os 127 registros chegam sem intervenção pedida", () => {
    for (const project of projects) {
      expect(project.needsPastoralIntervention).toBe("nao");
    }
  });
});
