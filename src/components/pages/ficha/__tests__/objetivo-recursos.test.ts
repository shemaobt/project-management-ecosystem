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
const { useRecordStore, NEW_RECORD, makeEmptyProject, missingRequired } =
  await import("../../../../stores/recordStore");
const {
  FINANCIAL_RESOURCES,
  OBJECTIVES,
  TRANSLATION_TYPES,
} = await import("../../../../constants/project");
const { sortProjects } = await import("../../projetos/sorting");
const { getDeadlineInfo } = await import("../../../../utils/recency");
const { makeProject } = await import("../../../../utils/__tests__/factory");
const { appendPhase, patchPhase, phaseTitle, removePhase } = await import(
  "../tabs/objetivo/phases"
);
const { default: i18n } = await import("../../../../i18n");

const projects = await projectsAPI.list();

beforeEach(() => {
  storage.clear();
  useRecordStore.setState({ drafts: {} });
});

function draftValues() {
  return {
    ...makeEmptyProject(),
    ...useRecordStore.getState().drafts[NEW_RECORD],
  };
}

describe("a bandeira ETEN e as fontes de recurso são campos independentes", () => {
  it("marcar a fonte OBT TABLE - ETEN não liga a bandeira", () => {
    useRecordStore.getState().updateDraft(NEW_RECORD, {
      financialResources: ["OBT TABLE - ETEN"],
    });
    const values = draftValues();
    expect(values.financialResources).toEqual(["OBT TABLE - ETEN"]);
    expect(values.inETEN).toBe(false);
  });

  it("ligar a bandeira não acrescenta a fonte", () => {
    useRecordStore.getState().updateDraft(NEW_RECORD, { inETEN: true });
    const values = draftValues();
    expect(values.inETEN).toBe(true);
    expect(values.financialResources).toEqual([]);
  });

  it("os dois descasamentos sobrevivem juntos no mesmo registro", () => {
    const onListWithoutSource = makeProject({
      inETEN: true,
      financialResources: [],
    });
    const sourceWithoutList = makeProject({
      inETEN: false,
      financialResources: ["OBT TABLE - ETEN"],
    });
    expect(onListWithoutSource.inETEN).toBe(true);
    expect(onListWithoutSource.financialResources).not.toContain(
      "OBT TABLE - ETEN",
    );
    expect(sourceWithoutList.inETEN).toBe(false);
    expect(sourceWithoutList.financialResources).toContain("OBT TABLE - ETEN");
  });
});

describe("o prazo definido na aba é o que a ordenação do F2 consome", () => {
  it("o valor do input de data ordena como o comparador espera, vazios por último", () => {
    const early = makeProject({ id: "cedo", deadline: "2026-09-01" });
    const late = makeProject({ id: "tarde", deadline: "2026-10-01" });
    const blank = makeProject({ id: "sem-prazo", deadline: "" });
    const ordered = sortProjects([blank, late, early], "deadline", "pt");
    expect(ordered.map((project) => project.id)).toEqual([
      "cedo",
      "tarde",
      "sem-prazo",
    ]);
  });

  it("getDeadlineInfo lê a mesma forma que o campo grava", () => {
    const info = getDeadlineInfo(
      "2026-09-01",
      new Date("2026-08-12T12:00:00"),
    );
    expect(info.cls).toBe("soon");
    expect(info.days).toBe(20);
    expect(getDeadlineInfo("").days).toBeNull();
  });

  it("início e prazo atravessam o rascunho sem mudar de forma", () => {
    useRecordStore.getState().updateDraft(NEW_RECORD, {
      startDate: "2026-01-15",
      deadline: "2027-06-30",
    });
    const values = draftValues();
    expect(values.startDate).toBe("2026-01-15");
    expect(values.deadline).toBe("2027-06-30");
  });
});

describe("o escopo é obrigatório no registro inteiro", () => {
  it("uma ficha sem escopo aparece na lista de pendências", () => {
    expect(missingRequired(makeEmptyProject())).toContain("objective");
  });

  it("um escopo marcado sai da lista", () => {
    const values = { ...makeEmptyProject(), objective: ["NT" as const] };
    expect(missingRequired(values)).not.toContain("objective");
  });
});

describe("as etapas podem não existir", () => {
  it("a ficha nova nasce sem etapas e nenhuma fixture traz alguma", () => {
    expect(makeEmptyProject().phases).toEqual([]);
    for (const project of projects) {
      expect(Array.isArray(project.phases)).toBe(true);
      expect(project.phases).toHaveLength(0);
    }
  });

  it("as operações do editor funcionam a partir do vazio", () => {
    const first = appendPhase([]);
    expect(first).toEqual([{ label: "", scope: "", date: "" }]);
    const renamed = patchPhase(appendPhase(first), 0, {
      scope: "Evangelho de João",
    });
    expect(renamed[0].scope).toBe("Evangelho de João");
    expect(renamed[1].scope).toBe("");
    expect(removePhase(renamed, 0)).toHaveLength(1);
    expect(removePhase([], 0)).toEqual([]);
  });

  it("etapa sem rótulo recebe o nome pela posição", () => {
    expect(
      phaseTitle({ label: "", scope: "", date: "" }, 2, "Etapa"),
    ).toBe("Etapa 3");
    expect(
      phaseTitle({ label: "Fase piloto", scope: "", date: "" }, 2, "Etapa"),
    ).toBe("Fase piloto");
  });

  it("remover uma etapa do meio e adicionar outra não repete nome", () => {
    const three = appendPhase(appendPhase(appendPhase([])));
    const afterSwap = appendPhase(removePhase(three, 1));
    const names = afterSwap.map((phase, index) =>
      phaseTitle(phase, index, "Etapa"),
    );
    expect(names).toEqual(["Etapa 1", "Etapa 2", "Etapa 3"]);
    expect(new Set(names).size).toBe(names.length);
  });

  it("o nome da etapa acompanha o idioma da tela, não o do momento da criação", () => {
    const stored = appendPhase([])[0];
    expect(phaseTitle(stored, 1, "Etapa")).toBe("Etapa 2");
    expect(phaseTitle(stored, 1, "Phase")).toBe("Phase 2");
  });
});

describe("as opções vêm das constantes portadas, e nada privilegia a escrita", () => {
  it("uma ficha nova não pré-seleciona tipo de tradução nem fonte", () => {
    const blank = makeEmptyProject();
    expect(blank.translationType).toEqual([]);
    expect(blank.financialResources).toEqual([]);
    expect(blank.objective).toEqual([]);
  });

  it("os vocabulários são os do protótipo, na ordem aprovada", () => {
    expect(OBJECTIVES[0]).toBe("NT");
    expect(TRANSLATION_TYPES.slice(0, 2)).toEqual(["OBT", "OMT"]);
    expect(FINANCIAL_RESOURCES).toContain("OBT TABLE - ETEN");
    expect(FINANCIAL_RESOURCES).toContain("Outros");
  });

  it("as chaves novas traduzem nas duas línguas", async () => {
    const keys = [
      "f_financial_other",
      "d_financial_other",
      "placeholder_financial_other",
      "placeholder_financial_notes",
      "placeholder_objective_notes",
      "f_phase_remove",
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
