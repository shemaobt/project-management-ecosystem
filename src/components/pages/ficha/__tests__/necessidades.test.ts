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

const { projectsAPI } = await import("../../../../fixtures");
const {
  NEED_CATEGORIES,
  NEED_STATUSES,
  NEED_STATUS_SYMBOLS,
  NEED_URGENCIES,
  NEED_URGENCY_SYMBOLS,
  OPEN_NEED_STATUSES,
} = await import("../../../../constants/project");
const {
  addNeed,
  aggregateNeeds,
  closedOn,
  hasOpenNeeds,
  hasUrgentOpenNeed,
  isOpenNeed,
  makeNeed,
  openNeeds,
  removeNeedAt,
  setNeedAt,
  setNeedStatus,
} = await import("../../../../utils/needs");
const { getOverallHealth } = await import("../../../../utils/health");
const { matchesPreset } = await import("../../../../utils/presets");
const { filterProjects } = await import("../../../../utils/search");
const { EMPTY_FILTERS } = await import("../../../../stores/filtersStore");
const { useRecordStore } = await import("../../../../stores/recordStore");
const { makeProject } = await import("../../../../utils/__tests__/factory");

const projects = await projectsAPI.list();
const prototype = readFileSync("DS-PROJECT/modals.jsx", "utf8");

const need = (over: Partial<ReturnType<typeof makeNeed>> = {}) => ({
  ...makeNeed(),
  ...over,
});

const withNeeds = (
  needs: ReturnType<typeof makeNeed>[],
  over: Record<string, unknown> = {},
) => makeProject({ needsItems: needs, ...over });

beforeEach(() => {
  storage.clear();
  useRecordStore.setState({ drafts: {} });
});

describe("a categoria é a do protótipo, e a urgência tem três degraus", () => {
  it("as nove categorias vêm de NEED_CATEGORIES", () => {
    const inPrototype = [
      ...prototype.matchAll(/id: '([a-z]+)', i18n: 'need_cat_/gu),
    ].map((match) => match[1]);
    expect(inPrototype.length).toBeGreaterThan(0);
    expect(NEED_CATEGORIES.map((entry) => entry.id)).toEqual(inPrototype);
  });

  it("urgência é baixa, média e urgente — nada mais", () => {
    expect(NEED_URGENCIES).toEqual(["low", "medium", "high"]);
  });
});

describe("o pedido tem ciclo de vida, e é esse o ponto", () => {
  it("quatro estados: aberto, em curso, atendido e não é mais necessário", () => {
    expect(NEED_STATUSES).toEqual([
      "open",
      "in-progress",
      "fulfilled",
      "dropped",
    ]);
  });

  it("aberto e em curso contam como pendente; atendido e descartado não", () => {
    expect(OPEN_NEED_STATUSES).toEqual(["open", "in-progress"]);
    expect(isOpenNeed(need({ status: "open" }))).toBe(true);
    expect(isOpenNeed(need({ status: "in-progress" }))).toBe(true);
    expect(isOpenNeed(need({ status: "fulfilled" }))).toBe(false);
    expect(isOpenNeed(need({ status: "dropped" }))).toBe(false);
  });

  it("atender tira da lista aberta sem apagar o pedido", () => {
    const list = [
      need({ description: "Gravador", status: "open" }),
      need({ description: "Curso", status: "open" }),
    ];

    const after = setNeedAt(setNeedStatus(list, 0, "fulfilled"), 0, {
      fulfilledBy: "Base regional",
      fulfilledDate: "2026-06-01",
    });

    expect(after).toHaveLength(2);
    expect(openNeeds(after).map((entry) => entry.description)).toEqual(["Curso"]);
    expect(after[0].description).toBe("Gravador");
    expect(after[0].fulfilledBy).toBe("Base regional");
    expect(list[0].status).toBe("open");
  });

  it("deixar de ser necessário também encerra sem apagar", () => {
    const list = [need({ description: "Van", status: "open" })];
    const after = setNeedStatus(list, 0, "dropped");

    expect(after).toHaveLength(1);
    expect(openNeeds(after)).toHaveLength(0);
    expect(hasOpenNeeds(after)).toBe(false);
  });

  it("sair de atendido não deixa quem atendeu para trás", () => {
    const fulfilled = setNeedAt(
      setNeedStatus([need()], 0, "fulfilled"),
      0,
      { fulfilledBy: "Base regional", fulfilledDate: "2026-06-01" },
    );
    expect(fulfilled[0].fulfilledBy).toBe("Base regional");

    const dropped = setNeedStatus(fulfilled, 0, "dropped");
    expect(dropped[0].fulfilledBy).toBeUndefined();
    expect(dropped[0].fulfilledDate).toBeUndefined();

    const reopened = setNeedStatus(fulfilled, 0, "open");
    expect(reopened[0].fulfilledBy).toBeUndefined();
  });

  it("a data de descarte tem campo próprio e não vira data de atendimento", () => {
    const dropped = setNeedAt(setNeedStatus([need()], 0, "dropped"), 0, {
      droppedDate: "2026-05-02",
    });
    expect(dropped[0].droppedDate).toBe("2026-05-02");
    expect(dropped[0].fulfilledDate).toBeUndefined();
    expect(closedOn(dropped[0])).toBe("2026-05-02");

    const back = setNeedStatus(dropped, 0, "in-progress");
    expect(back[0].droppedDate).toBeUndefined();
    expect(closedOn(back[0])).toBeUndefined();
  });

  it("um pedido descartado não segura o projeto em Pedem atenção", () => {
    const urgent = withNeeds([need({ urgency: "high", status: "open" })]);
    expect(matchesPreset(urgent, "attention")).toBe(true);

    for (const status of ["fulfilled", "dropped"] as const) {
      const closed = setNeedStatus(urgent.needsItems, 0, status);
      expect(hasUrgentOpenNeed(closed), status).toBe(false);
      expect(
        matchesPreset({ ...urgent, needsItems: closed }, "attention"),
        status,
      ).toBe(false);
    }
  });

  it("acrescentar e remover mexem só na lista, e a nova nasce aberta", () => {
    const empty: ReturnType<typeof makeNeed>[] = [];
    const one = addNeed(empty);

    expect(one).toHaveLength(1);
    expect(one[0].status).toBe("open");
    expect(one[0].description).toBe("");
    expect(empty).toHaveLength(0);

    expect(removeNeedAt(one, 0)).toHaveLength(0);
  });
});

describe("urgência não é saúde", () => {
  it("uma equipe saudável pode estar sem equipamento", () => {
    const project = withNeeds([need({ urgency: "high", status: "open" })], {
      healthEmotional: "boa",
      healthRelational: "boa",
      healthSpiritual: "boa",
      healthPhysical: "boa",
    });

    expect(getOverallHealth(project)).toBe("boa");
    expect(hasUrgentOpenNeed(project.needsItems)).toBe(true);
  });

  it("mudar a urgência não move a saúde geral", () => {
    for (const urgency of NEED_URGENCIES) {
      const project = withNeeds([need({ urgency, status: "open" })]);
      expect(getOverallHealth(project), urgency).toBe("na");
    }
  });

  it("o filtro de saúde não muda quando a urgência muda", () => {
    const base = [
      withNeeds([need({ urgency: "low" })], { healthEmotional: "boa" }),
      withNeeds([need({ urgency: "low" })], { healthEmotional: "critica" }),
    ];
    const escalated = base.map((project) => ({
      ...project,
      needsItems: setNeedAt(project.needsItems, 0, { urgency: "high" }),
    }));

    const countsFor = (list: typeof base) =>
      filterProjects(list, EMPTY_FILTERS, "").counts.health;

    expect(countsFor(escalated)).toEqual(countsFor(base));
  });

  it("os vocabulários não se cruzam", () => {
    const urgencies = new Set<string>(NEED_URGENCIES);
    for (const level of ["boa", "atencao", "critica", "na"]) {
      expect(urgencies.has(level)).toBe(false);
    }
  });
});

describe("os pedidos somam por região e por período", () => {
  const brasil = withNeeds(
    [
      need({ category: "equipment", urgency: "high", submittedAt: "2026-02-10" }),
      need({
        category: "training",
        urgency: "low",
        status: "fulfilled",
        submittedAt: "2026-05-20",
      }),
    ],
    { location: "Brazil, Rondônia" },
  );
  const peru = withNeeds(
    [need({ category: "equipment", urgency: "medium", submittedAt: "2026-03-15" })],
    { location: "Peru" },
  );
  const uganda = withNeeds(
    [need({ category: "security", urgency: "high", submittedAt: "2026-04-01" })],
    { location: "Uganda" },
  );
  const all = [brasil, peru, uganda];

  it("soma tudo quando não se pede recorte", () => {
    const rollup = aggregateNeeds(all);
    expect(rollup.total).toBe(4);
    expect(rollup.open).toBe(3);
    expect(rollup.projects).toBe(3);
    expect(rollup.byCategory.equipment).toBe(2);
    expect(rollup.byUrgency.high).toBe(2);
    expect(rollup.byStatus.fulfilled).toBe(1);
  });

  it("soma por região sem um segundo store", () => {
    const rollup = aggregateNeeds(all);
    expect(rollup.byRegion["south-america"]).toBe(3);
    expect(rollup.byRegion.africa).toBe(1);

    const africa = aggregateNeeds(all, { region: "africa" });
    expect(africa.total).toBe(1);
    expect(africa.projects).toBe(1);
    expect(africa.byCategory.security).toBe(1);
  });

  it("recorta por período pela data em que o pedido foi levantado", () => {
    const firstQuarter = aggregateNeeds(all, {
      from: "2026-01-01",
      to: "2026-03-31",
    });
    expect(firstQuarter.total).toBe(2);
    expect(firstQuarter.byCategory.equipment).toBe(2);
    expect(firstQuarter.byStatus.fulfilled).toBe(0);

    const combined = aggregateNeeds(all, {
      region: "south-america",
      from: "2026-01-01",
      to: "2026-03-31",
    });
    expect(combined.total).toBe(2);
    expect(combined.byRegion.africa).toBeUndefined();
  });

  it("pedido sem data fica de fora do recorte por período, não do total", () => {
    const undated = withNeeds([need({ category: "material" })], {
      location: "Brazil",
    });
    expect(aggregateNeeds([undated]).total).toBe(1);
    expect(aggregateNeeds([undated], { from: "2026-01-01" }).total).toBe(0);
  });

  it("as 127 fixtures ainda não trazem pedido nenhum", () => {
    const rollup = aggregateNeeds(projects);
    expect(rollup.total).toBe(0);
    expect(rollup.projects).toBe(0);
    expect(projects.every((project) => !hasOpenNeeds(project.needsItems))).toBe(
      true,
    );
  });
});

describe("a sidebar ganha a faceta de pedido em aberto", () => {
  const list = [
    withNeeds([need({ status: "open" })]),
    withNeeds([need({ status: "fulfilled" })]),
    withNeeds([]),
  ];

  it("conta quem tem e quem não tem", () => {
    const { counts } = filterProjects(list, EMPTY_FILTERS, "");
    expect(counts.hasOpenNeeds).toEqual({ yes: 1, no: 2 });
  });

  it("filtra pelos dois lados", () => {
    const yes = filterProjects(list, { ...EMPTY_FILTERS, hasOpenNeeds: "yes" }, "");
    const no = filterProjects(list, { ...EMPTY_FILTERS, hasOpenNeeds: "no" }, "");
    expect(yes.projects).toHaveLength(1);
    expect(no.projects).toHaveLength(2);
  });

  it("atender o pedido tira o projeto da faceta", () => {
    const list = [need({ status: "open" })];
    expect(hasOpenNeeds(list)).toBe(true);
    expect(hasOpenNeeds(setNeedStatus(list, 0, "fulfilled"))).toBe(false);
  });
});

describe("estado e urgência se leem sem cor", () => {
  it("cada estado tem símbolo próprio", () => {
    expect(Object.keys(NEED_STATUS_SYMBOLS).sort()).toEqual(
      [...NEED_STATUSES].sort(),
    );
    expect(new Set(Object.values(NEED_STATUS_SYMBOLS)).size).toBe(
      NEED_STATUSES.length,
    );
  });

  it("cada urgência tem símbolo próprio, em ordem crescente", () => {
    expect(Object.keys(NEED_URGENCY_SYMBOLS).sort()).toEqual(
      [...NEED_URGENCIES].sort(),
    );
    expect(new Set(Object.values(NEED_URGENCY_SYMBOLS)).size).toBe(
      NEED_URGENCIES.length,
    );
    const lengths = NEED_URGENCIES.map(
      (urgency) => NEED_URGENCY_SYMBOLS[urgency].length,
    );
    expect(lengths).toEqual([...lengths].sort((a, b) => a - b));
  });
});
