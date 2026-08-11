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
  useRecordStore,
  missingRequired,
  makeEmptyProject,
  NEW_RECORD,
  REQUIRED_FIELDS,
  REQUIRED_FIELD_TAB,
  hasDraft,
} = await import("../../../../stores/recordStore");
const { useProjectsStore, selectProject, PROJECTS_VERSION } = await import(
  "../../../../stores/projectsStore"
);
const { RECORD_TABS, DEFAULT_TAB, isRecordTab, tabNumber, TAB_LABEL_KEYS } =
  await import("../../../../constants/recordTabs");
const { TAB_COMPONENTS } = await import("../tabs");

beforeEach(() => {
  storage.clear();
  useRecordStore.setState({ drafts: {} });
  useProjectsStore.setState({ projects: [], hydrated: false });
});

describe("as dez abas da ficha", () => {
  it("estão na ordem do protótipo e numeradas de 1 a 10", () => {
    expect(RECORD_TABS).toEqual([
      "identidade",
      "equipe",
      "objetivo",
      "recursos",
      "progresso",
      "saude",
      "necessidades",
      "midia",
      "notas",
      "materiais",
    ]);
    expect(RECORD_TABS.map(tabNumber)).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10,
    ]);
  });

  it("cada aba tem componente próprio, que é o que permite dividir FE-21…28", () => {
    for (const tab of RECORD_TABS) {
      expect(TAB_COMPONENTS[tab]).toBeTypeOf("function");
    }
    const components = new Set(RECORD_TABS.map((tab) => TAB_COMPONENTS[tab]));
    expect(components.size).toBe(RECORD_TABS.length);
  });

  it("a identidade da aba na URL não é traduzível, o rótulo é", () => {
    for (const tab of RECORD_TABS) {
      expect(tab).toMatch(/^[a-z]+$/);
      expect(TAB_LABEL_KEYS[tab]).toMatch(/^sec_/);
    }
  });

  it("aba inventada não passa, e a padrão é a identidade", () => {
    expect(isRecordTab("identidade")).toBe(true);
    expect(isRecordTab("coral")).toBe(false);
    expect(DEFAULT_TAB).toBe("identidade");
  });
});

describe("o rascunho não some", () => {
  it("sobrevive à troca de aba e à recarga", async () => {
    useRecordStore.getState().updateDraft(NEW_RECORD, {
      languageName: "Yanomami",
    });
    useRecordStore.getState().updateDraft(NEW_RECORD, {
      bridgeLanguage: "Português",
    });

    const onDisk = storage.getItem("shema-record-drafts-v1")!;
    expect(JSON.parse(onDisk).state.drafts[NEW_RECORD].languageName).toBe(
      "Yanomami",
    );

    useRecordStore.setState({ drafts: {} });
    storage.setItem("shema-record-drafts-v1", onDisk);
    await useRecordStore.persist.rehydrate();

    const draft = useRecordStore.getState().drafts[NEW_RECORD];
    expect(draft.languageName).toBe("Yanomami");
    expect(draft.bridgeLanguage).toBe("Português");
  });

  it("um rascunho por ficha, sem vazar de uma para outra", () => {
    const { updateDraft } = useRecordStore.getState();
    updateDraft(NEW_RECORD, { languageName: "Yanomami" });
    updateDraft("projeto-a", { languageName: "Xhosa" });

    const { drafts } = useRecordStore.getState();
    expect(drafts[NEW_RECORD].languageName).toBe("Yanomami");
    expect(drafts["projeto-a"].languageName).toBe("Xhosa");
    expect(hasDraft(drafts, "projeto-b")).toBe(false);
  });

  it("descartar apaga só a ficha apontada", () => {
    const { updateDraft, discardDraft } = useRecordStore.getState();
    updateDraft(NEW_RECORD, { languageName: "Yanomami" });
    updateDraft("projeto-a", { languageName: "Xhosa" });
    discardDraft(NEW_RECORD);

    const { drafts } = useRecordStore.getState();
    expect(hasDraft(drafts, NEW_RECORD)).toBe(false);
    expect(drafts["projeto-a"].languageName).toBe("Xhosa");
  });
});

describe("os quatro obrigatórios são cobrados num lugar só", () => {
  it("uma ficha vazia acusa exatamente os quatro", () => {
    expect(missingRequired(makeEmptyProject())).toEqual([...REQUIRED_FIELDS]);
  });

  it("objetivo conta como vazio quando a lista está vazia", () => {
    const draft = {
      ...makeEmptyProject(),
      languageName: "Yanomami",
      bridgeLanguage: "Português",
      team: "YWAM Boa Vista",
    };
    expect(missingRequired(draft)).toEqual(["objective"]);
    expect(missingRequired({ ...draft, objective: ["NT"] })).toEqual([]);
  });

  it("espaço em branco não preenche obrigatório", () => {
    expect(
      missingRequired({ ...makeEmptyProject(), languageName: "   " }),
    ).toContain("languageName");
  });

  it("cada obrigatório aponta a aba onde ele mora", () => {
    expect(REQUIRED_FIELD_TAB.languageName).toBe("identidade");
    expect(REQUIRED_FIELD_TAB.bridgeLanguage).toBe("identidade");
    expect(REQUIRED_FIELD_TAB.team).toBe("equipe");
    expect(REQUIRED_FIELD_TAB.objective).toBe("objetivo");
  });
});

describe("salvar é o único momento em que a coleção muda", () => {
  it("a ficha nova entra na lista e a existente é substituída", () => {
    const base = { ...makeEmptyProject(), id: "p1", languageName: "Xhosa" };
    const { saveProject } = useProjectsStore.getState();

    saveProject(base);
    expect(useProjectsStore.getState().projects).toHaveLength(1);

    saveProject({ ...base, languageName: "Xhosa revisado" });
    const { projects } = useProjectsStore.getState();
    expect(projects).toHaveLength(1);
    expect(selectProject(projects, "p1")?.languageName).toBe("Xhosa revisado");
  });

  it("mexer no rascunho não toca na coleção", () => {
    useRecordStore.getState().updateDraft("p1", { languageName: "Outro nome" });
    expect(useProjectsStore.getState().projects).toHaveLength(0);
  });

  it("a cópia guardada não fica presa: outra versão manda reler o fixture", async () => {
    storage.setItem(
      "shema-projects-v1",
      JSON.stringify({
        state: { projects: [{ id: "antigo" }], hydrated: true },
        version: PROJECTS_VERSION - 1,
      }),
    );
    await useProjectsStore.persist.rehydrate();

    expect(useProjectsStore.getState().hydrated).toBe(false);
    expect(useProjectsStore.getState().projects).toHaveLength(0);
  });

  it("na mesma versão a cópia guardada é respeitada, e as edições sobrevivem", async () => {
    storage.setItem(
      "shema-projects-v1",
      JSON.stringify({
        state: { projects: [{ id: "salvo" }], hydrated: true },
        version: PROJECTS_VERSION,
      }),
    );
    await useProjectsStore.persist.rehydrate();

    expect(useProjectsStore.getState().hydrated).toBe(true);
    expect(useProjectsStore.getState().projects[0].id).toBe("salvo");
  });
});
