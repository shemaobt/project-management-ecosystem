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

const {
  applyProgressUpdate,
  decreasedCounts,
  getProgress,
  getProjectStatus,
  historyDeltas,
  progressAsOf,
  withRolledAggregates,
} = await import("../../../../utils/progress");
const { makeProject } = await import("../../../../utils/__tests__/factory");
const { useRecordStore, NEW_RECORD, materializeDraft } = await import(
  "../../../../stores/recordStore"
);
const { BIBLE_BOOKS } = await import("../../../../constants/bible");
const {
  addBookRow,
  clampChapters,
  clampCount,
  showsBookTable,
  showsOtherTable,
  showsStoryTable,
  statusOptionsFor,
  STATUS_OPTIONS,
  toBreakdownRow,
  visibleSections,
} = await import("../tabs/progresso/sections");
const { PROJECT_STATUSES } = await import("../../../../constants/project");
const { getUnitShare } = await import("../../projetos/card");
const { default: i18n } = await import("../../../../i18n");

beforeEach(() => {
  storage.clear();
  useRecordStore.setState({ drafts: {} });
});

function genesisRow(counts: {
  translated: number;
  communityChecked: number;
  mentorApproved: number;
}) {
  return { id: "gen", name: "Gênesis", chapters: 50, ...counts };
}

function seedTwoYears() {
  const seeded = applyProgressUpdate(
    null,
    makeProject({
      id: "p1",
      objective: ["Livros Específicos"],
      bookProgress: [
        genesisRow({ translated: 10, communityChecked: 5, mentorApproved: 2 }),
      ],
    }),
    "2025-03-10",
  );
  return applyProgressUpdate(
    seeded,
    {
      ...seeded,
      bookProgress: [
        genesisRow({ translated: 20, communityChecked: 12, mentorApproved: 8 }),
      ],
    },
    "2026-02-01",
  );
}

describe("o histórico responde qual era a contagem em 31 de dezembro", () => {
  it("registra em dois anos e reconstrói o fim do ano anterior", () => {
    const grown = seedTwoYears();
    expect(grown.progressHistory).toHaveLength(2);

    const yearEnd = progressAsOf(grown, "2025-12-31");
    expect(yearEnd).not.toBeNull();
    expect(yearEnd?.translatedUnits).toBe(10);
    expect(yearEnd?.communityCheckedUnits).toBe(5);
    expect(yearEnd?.approvedUnits).toBe(2);
    expect(yearEnd?.totalUnits).toBe(50);
    expect(yearEnd?.bookProgress?.[0]?.translated).toBe(10);

    const current = progressAsOf(grown, "2026-12-31");
    expect(current?.translatedUnits).toBe(20);
    expect(current?.approvedUnits).toBe(8);
  });

  it("antes do primeiro registro não há resposta, não zero inventado", () => {
    const grown = seedTwoYears();
    expect(progressAsOf(grown, "2024-12-31")).toBeNull();
  });

  it("registro antigo sem snapshot responde com null explícito, não quebra", () => {
    const legacy = makeProject({
      progressHistory: [
        {
          date: "2025-06-01",
          translatedUnits: 4,
          communityCheckedUnits: 2,
          approvedUnits: 1,
        },
      ],
    });
    const snapshot = progressAsOf(legacy, "2025-12-31");
    expect(snapshot?.translatedUnits).toBe(4);
    expect(snapshot?.totalUnits).toBeNull();
    expect(snapshot?.bookProgress).toBeNull();
  });

  it("a entrada carrega a origem quando o chamador a informa", () => {
    const grown = seedTwoYears();
    const fromPulse = applyProgressUpdate(
      grown,
      {
        ...grown,
        bookProgress: [
          genesisRow({ translated: 25, communityChecked: 12, mentorApproved: 8 }),
        ],
      },
      "2026-07-01",
      { fromField: "Maria K.", formType: "full" },
    );
    const tagged = fromPulse.progressHistory.at(-1);
    expect(tagged?.fromField).toBe("Maria K.");
    expect(tagged?.formType).toBe("full");

    const inApp = grown.progressHistory.at(-1);
    expect(inApp?.fromField).toBeUndefined();
    expect(inApp?.formType).toBeUndefined();
  });

  it("dois registros no mesmo dia: o mais recente vale", () => {
    const grown = seedTwoYears();
    const corrected = applyProgressUpdate(
      grown,
      {
        ...grown,
        bookProgress: [
          genesisRow({
            translated: 21,
            communityChecked: 12,
            mentorApproved: 8,
          }),
        ],
      },
      "2026-02-01",
    );
    expect(progressAsOf(corrected, "2026-02-01")?.translatedUnits).toBe(21);
  });

  it("a granularidade por unidade permite qualquer definição de crédito", () => {
    const grown = seedTwoYears();
    const before = progressAsOf(grown, "2025-12-31");
    const after = progressAsOf(grown, "2026-12-31");
    const approvedDelta =
      (after?.bookProgress?.[0]?.mentorApproved ?? 0) -
      (before?.bookProgress?.[0]?.mentorApproved ?? 0);
    expect(approvedDelta).toBe(6);
  });
});

describe("salvar sem mudança não inventa registro", () => {
  it("reaplicar o mesmo estado mantém o histórico", () => {
    const grown = seedTwoYears();
    const again = applyProgressUpdate(grown, grown, "2026-03-01");
    expect(again.progressHistory).toHaveLength(grown.progressHistory.length);
    expect(again.translatedUnits).toBe(grown.translatedUnits);
  });

  it("sem tabelas, os agregados existentes ficam como estão", () => {
    const manual = applyProgressUpdate(
      null,
      makeProject({ translatedUnits: 7, totalUnits: 20 }),
      "2026-01-05",
    );
    expect(manual.translatedUnits).toBe(7);
    expect(manual.totalUnits).toBe(20);
    expect(manual.progressHistory).toHaveLength(1);
    expect(manual.progressHistory[0]?.initial).toBe(true);
  });

  it("só linhas de histórias não zeram os agregados que a tabela não expressa", () => {
    const stored = makeProject({
      id: "p-hist",
      objective: ["Histórias"],
      translatedUnits: 14,
      communityCheckedUnits: 9,
      approvedUnits: 4,
      totalUnits: 30,
    });
    const withStory = applyProgressUpdate(
      stored,
      {
        ...stored,
        storyProgress: [{ name: "A criação", audioHours: 2 }],
      },
      "2026-06-01",
    );
    expect(withStory.translatedUnits).toBe(14);
    expect(withStory.communityCheckedUnits).toBe(9);
    expect(withStory.approvedUnits).toBe(4);
    expect(withStory.totalUnits).toBe(30);
    expect(withStory.progressHistory).toHaveLength(0);
    expect(decreasedCounts(withStory)).toEqual([]);
  });
});

describe("uma queda é visível, nunca silenciosa", () => {
  it("o registro da queda carrega o valor anterior e o delta negativo", () => {
    const grown = seedTwoYears();
    const corrected = applyProgressUpdate(
      grown,
      {
        ...grown,
        bookProgress: [
          genesisRow({
            translated: 15,
            communityChecked: 12,
            mentorApproved: 8,
          }),
        ],
      },
      "2026-05-01",
    );
    const last = corrected.progressHistory.at(-1);
    expect(last?.previousTranslated).toBe(20);
    expect(last && historyDeltas(last).translated).toBe(-5);
    expect(last && historyDeltas(last).approved).toBe(0);
  });

  it("o rascunho denuncia a queda antes de salvar", () => {
    const draft = makeProject({
      translatedUnits: 20,
      communityCheckedUnits: 12,
      approvedUnits: 8,
      bookProgress: [
        genesisRow({ translated: 15, communityChecked: 12, mentorApproved: 8 }),
      ],
    });
    expect(decreasedCounts(draft)).toEqual(["translated"]);
  });

  it("sem tabelas não há comparação possível", () => {
    expect(decreasedCounts(makeProject({ translatedUnits: 9 }))).toEqual([]);
  });
});

describe("o agregado que o cartão do F2 lê deriva das linhas", () => {
  it("salvar rola as linhas para os totais e o total planejado", () => {
    const grown = seedTwoYears();
    expect(grown.translatedUnits).toBe(20);
    expect(grown.communityCheckedUnits).toBe(12);
    expect(grown.approvedUnits).toBe(8);
    expect(grown.totalUnits).toBe(50);
    expect(getProgress(grown)).toBe(40);
    expect(getUnitShare(grown.communityCheckedUnits, grown.translatedUnits)).toBe(
      0.6,
    );
  });
});

describe("o status do projeto persiste pela ficha", () => {
  it("o rascunho carrega o status e o salvamento não o reinterpreta", () => {
    useRecordStore.getState().updateDraft(NEW_RECORD, { status: "pausado" });
    const values = {
      ...useRecordStore.getState().drafts[NEW_RECORD],
    };
    const project = materializeDraft(values, "novo-1");
    expect(project.status).toBe("pausado");

    const saved = applyProgressUpdate(null, project, "2026-08-12");
    expect(saved.status).toBe("pausado");
    expect(getProjectStatus(saved)).toBe("pausado");
  });
});

describe("as tabelas seguem o escopo do objetivo", () => {
  it("cada seção responde ao seu gatilho, e nada aparece sem escopo nem dado", () => {
    const blank = visibleSections(makeProject());
    expect(blank).toEqual({ books: false, stories: false, other: false });

    expect(
      showsBookTable({ objective: ["NT"], translationType: [] }),
    ).toBe(true);
    expect(
      showsBookTable({ objective: ["Histórias"], translationType: [] }),
    ).toBe(false);
    expect(
      showsStoryTable({ objective: ["Histórias"], translationType: [] }),
    ).toBe(true);
    expect(
      showsOtherTable({ objective: ["Outro"], translationType: [] }),
    ).toBe(true);
    expect(
      showsOtherTable({ objective: [], translationType: ["Filme Jesus"] }),
    ).toBe(true);
    expect(
      showsOtherTable({ objective: [], translationType: ["OBT"] }),
    ).toBe(false);
  });

  it("linha gravada continua visível mesmo com o escopo desmarcado", () => {
    const withRows = visibleSections(
      makeProject({
        objective: ["Histórias"],
        bookProgress: [
          genesisRow({ translated: 3, communityChecked: 0, mentorApproved: 0 }),
        ],
      }),
    );
    expect(withRows.books).toBe(true);
    expect(withRows.stories).toBe(true);
    expect(withRows.other).toBe(false);
  });

  it("adicionar um livro já presente não duplica a linha", () => {
    const genesis = BIBLE_BOOKS.find((book) => book.id === "gen");
    expect(genesis).toBeDefined();
    if (!genesis) return;
    const once = addBookRow([], genesis);
    const twice = addBookRow(once, genesis);
    expect(twice).toHaveLength(1);
    expect(twice[0]?.chapters).toBe(50);
  });

  it("as contagens respeitam os limites nas bordas exatas", () => {
    expect(clampCount("50", 50)).toBe(50);
    expect(clampCount("60", 50)).toBe(50);
    expect(clampCount("-3", 50)).toBe(0);
    expect(clampCount("", 50)).toBe(0);
    expect(clampCount("3.7", 50)).toBe(3);
    expect(clampCount("12")).toBe(12);
    expect(clampChapters("0")).toBe(1);
    expect(clampChapters("")).toBe(1);
    expect(clampChapters("36")).toBe(36);
  });

  it("uma história vira linha de leitura sem contagens fantasmas", () => {
    const row = toBreakdownRow({ name: "A criação", audioHours: 2 });
    expect(row).toEqual({
      name: "A criação",
      chapters: 1,
      translated: 0,
      community: 0,
      approved: 0,
    });
  });
});

describe("as chaves novas traduzem nas duas línguas", () => {
  it("nenhuma chave cai no fallback e as línguas diferem", async () => {
    const keys = [
      "progress_no_scope_hint",
      "progress_decrease_warn",
      "story_record_status",
      "d_bp_books",
      "d_bp_stories",
      "unit_chapters_short",
      "row_remove",
    ];
    const seen: Record<string, string> = {};
    for (const lang of ["pt", "en"]) {
      await i18n.changeLanguage(lang);
      for (const key of keys) {
        const value = i18n.t(key);
        expect(value).not.toBe(key);
        if (lang === "en") expect(value).not.toBe(seen[key]);
        else seen[key] = value;
      }
    }
    await i18n.changeLanguage("pt");
  });
});

describe("a leitura mostra o que o save gravaria, não o que o último save deixou", () => {
  it("linhas editadas no rascunho rolam para os agregados da leitura", () => {
    const draft = makeProject({
      translatedUnits: 40,
      communityCheckedUnits: 20,
      approvedUnits: 10,
      totalUnits: 100,
      bookProgress: [
        genesisRow({ translated: 45, communityChecked: 20, mentorApproved: 10 }),
        { id: "exo", name: "Êxodo", chapters: 50, translated: 0, communityChecked: 0, mentorApproved: 0 },
      ],
    });
    const shown = withRolledAggregates(draft);
    const saved = applyProgressUpdate(draft, draft, "2026-08-12");
    expect(shown.translatedUnits).toBe(45);
    expect(shown.totalUnits).toBe(100);
    expect(shown.translatedUnits).toBe(saved.translatedUnits);
    expect(shown.communityCheckedUnits).toBe(saved.communityCheckedUnits);
    expect(shown.approvedUnits).toBe(saved.approvedUnits);
    expect(shown.totalUnits).toBe(saved.totalUnits);
  });

  it("sem tabelas que expressem contagens, a leitura mantém os agregados gravados", () => {
    const manual = makeProject({
      translatedUnits: 14,
      communityCheckedUnits: 9,
      approvedUnits: 4,
      totalUnits: 30,
      storyProgress: [{ name: "A criação", audioHours: 2 }],
    });
    const shown = withRolledAggregates(manual);
    expect(shown.translatedUnits).toBe(14);
    expect(shown.communityCheckedUnits).toBe(9);
    expect(shown.approvedUnits).toBe(4);
    expect(shown.totalUnits).toBe(30);
  });
});

describe("um status fora dos três cards continua expressável", () => {
  it("os três do protótipo ficam como estão quando o status é um deles", () => {
    expect(statusOptionsFor("em-andamento")).toBe(STATUS_OPTIONS);
    expect(statusOptionsFor("pausado", "planejado")).toBe(STATUS_OPTIONS);
  });

  it("um projeto concluído abre com o próprio status selecionável", () => {
    const options = statusOptionsFor("concluido");
    expect(options).toHaveLength(4);
    expect(options[3]).toMatchObject({
      value: "concluido",
      labelKey: "status_completed",
    });
  });

  it("a âncora no status salvo preserva o caminho de volta após tocar outro card", () => {
    const options = statusOptionsFor("pausado", "concluido");
    expect(options.map((option) => option.value)).toContain("concluido");
  });

  it("âncora e valor iguais não duplicam o card", () => {
    const options = statusOptionsFor("desconhecido", "desconhecido");
    expect(options).toHaveLength(4);
  });

  it("todo status do domínio tem um card que o expressa", () => {
    for (const status of PROJECT_STATUSES) {
      const values = statusOptionsFor(status).map((option) => option.value);
      expect(values).toContain(status);
    }
  });
});
