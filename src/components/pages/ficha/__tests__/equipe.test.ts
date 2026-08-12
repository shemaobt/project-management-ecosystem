import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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
const { REGION_TEAMS } = await import("../../../../fixtures/regions");
const { useRegionsStore } = await import("../../../../stores/regionsStore");
const { useRecordStore, NEW_RECORD, missingRequired, makeEmptyProject } =
  await import("../../../../stores/recordStore");
const { addPerson, joinPeople, removePerson, splitPeople } = await import(
  "../../../../utils/people"
);
const { resolveProjectRoles } = await import("../../../../utils/region");
const { makeProject } = await import("../../../../utils/__tests__/factory");

const projects = await projectsAPI.list();

const EMPTY_TEAM = { coordinator: "", obtLab: "", resourceCircle: "" };

beforeEach(() => {
  storage.clear();
  useRecordStore.setState({ drafts: {} });
});

afterEach(() => {
  REGION_TEAMS.oceania = { ...EMPTY_TEAM };
  REGION_TEAMS["south-america"] = { ...EMPTY_TEAM };
  useRegionsStore.setState({ regions: [], hydrated: false });
});

describe("os papéis da região são lidos, nunca copiados", () => {
  it("trocar o nome no organograma troca o nome na aba, e nada é gravado no projeto", async () => {
    REGION_TEAMS.oceania.coordinator = "Primeira Pessoa";
    REGION_TEAMS.oceania.obtLab = "Segunda Pessoa";
    REGION_TEAMS.oceania.resourceCircle = "Terceira Pessoa";
    await useRegionsStore.getState().hydrate();

    const project = makeProject({ location: "Papua New Guinea, Madang" });
    const before = resolveProjectRoles(
      project,
      useRegionsStore.getState().regions,
    );
    expect(before.map((role) => role.holder)).toEqual([
      "Primeira Pessoa",
      "Segunda Pessoa",
      "Terceira Pessoa",
    ]);

    REGION_TEAMS.oceania.coordinator = "Pessoa Nova";
    useRegionsStore.setState({ regions: [], hydrated: false });
    await useRegionsStore.getState().hydrate();

    const after = resolveProjectRoles(
      project,
      useRegionsStore.getState().regions,
    );
    expect(after[0].holder).toBe("Pessoa Nova");

    expect(project.regionalCoordinator).toBe("");
    expect(project.obtLabPerson).toBe("");
    expect(project.resourceCirclePerson).toBe("");
  });

  it("a aba nunca escreve um nome de papel no rascunho", async () => {
    REGION_TEAMS["south-america"].coordinator = "Alguém";
    await useRegionsStore.getState().hydrate();

    const { updateDraft } = useRecordStore.getState();
    updateDraft("brasil-1", { team: "JOCUM Porto Velho" });

    const draft = useRecordStore.getState().drafts["brasil-1"];
    expect(draft.regionalCoordinator).toBeUndefined();
    expect(draft.obtLabPerson).toBeUndefined();
    expect(draft.resourceCirclePerson).toBeUndefined();
  });

  it("região sem titular mostra vazio em vez de herdar de outra região", async () => {
    REGION_TEAMS.oceania.coordinator = "Só da Oceania";
    await useRegionsStore.getState().hydrate();

    const regions = useRegionsStore.getState().regions;
    const oceania = resolveProjectRoles({ location: "Fiji" }, regions);
    const africa = resolveProjectRoles({ location: "Uganda" }, regions);

    expect(oceania[0].holder).toBe("Só da Oceania");
    expect(africa[0].holder).toBeNull();
  });

  it("país fora do mapa cai na região other, não quebra", () => {
    const roles = resolveProjectRoles({ location: "Narnia, Cair Paravel" }, []);
    expect(roles).toHaveLength(3);
    expect(roles.every((role) => role.holder === null)).toBe(true);
  });

  it("os rótulos vêm do organograma, não de cópias no registro", async () => {
    await useRegionsStore.getState().hydrate();
    const roles = resolveProjectRoles(
      { location: "Brazil" },
      useRegionsStore.getState().regions,
    );
    expect(roles.map((role) => role.labelKey)).toEqual([
      "role_coordinator",
      "role_obtlab",
      "role_resource",
    ]);
  });

  it("nenhuma fixture carrega nome de papel no registro", () => {
    for (const project of projects) {
      expect(project.regionalCoordinator).toBe("");
      expect(project.obtLabPerson).toBe("");
      expect(project.resourceCirclePerson).toBe("");
    }
  });
});

describe("tradutores e revisores são vários, guardados em um campo só", () => {
  it("separa por vírgula e ponto e vírgula", () => {
    expect(splitPeople("Ana, Bruno; Carla")).toEqual(["Ana", "Bruno", "Carla"]);
    expect(splitPeople("  Ana  ,  Bruno  ")).toEqual(["Ana", "Bruno"]);
    expect(splitPeople("")).toEqual([]);
    expect(splitPeople(undefined)).toEqual([]);
    expect(splitPeople(",,, ;")).toEqual([]);
  });

  it("não parte um par que o campo registra como um contato só", () => {
    expect(splitPeople("Pati & Marcos")).toEqual(["Pati & Marcos"]);
    expect(splitPeople("Rafa / Ciro")).toEqual(["Rafa / Ciro"]);
    expect(splitPeople("Rodolfo / Debora")).toEqual(["Rodolfo / Debora"]);
  });

  it("acrescenta um por vez e também uma lista colada de uma vez", () => {
    expect(addPerson("", "Ana")).toBe("Ana");
    expect(addPerson("Ana", "Bruno")).toBe("Ana, Bruno");
    expect(addPerson("Ana", "Bruno, Carla")).toBe("Ana, Bruno, Carla");
    expect(addPerson("Ana", "   ")).toBe("Ana");
    expect(addPerson(undefined, "Ana")).toBe("Ana");
  });

  it("não repete quem já está na lista", () => {
    expect(addPerson("Ana, Bruno", "Ana")).toBe("Ana, Bruno");
    expect(addPerson("Ana", "Ana, Bruno")).toBe("Ana, Bruno");
  });

  it("remove pelo lugar, sem mexer no resto", () => {
    expect(removePerson("Ana, Bruno, Carla", 1)).toBe("Ana, Carla");
    expect(removePerson("Ana", 0)).toBe("");
    expect(removePerson("Ana, Bruno", 9)).toBe("Ana, Bruno");
  });

  it("ida e volta preserva os nomes que o campo já carregava", () => {
    for (const raw of [
      "Ana Beatriz, Rodolfo / Debora",
      "Etienne Pieterse",
      "Pati & Marcos; Rafa / Ciro",
    ]) {
      expect(joinPeople(splitPeople(raw))).toBe(
        splitPeople(raw).join(", "),
      );
      expect(splitPeople(joinPeople(splitPeople(raw)))).toEqual(
        splitPeople(raw),
      );
    }
  });

  it("nome não latino atravessa a lista sem perder caractere", () => {
    const nomes = ["नेपाली Sharma", "ᏣᎳᎩ Ross", "Ямал Ненэцие"];
    let field = "";
    for (const nome of nomes) field = addPerson(field, nome);
    expect(splitPeople(field)).toEqual(nomes);
  });
});

describe("base e YWAM/JOCUM são um conceito com dois nomes", () => {
  it("as 127 fixtures trazem os dois campos com o mesmo valor", () => {
    for (const project of projects) {
      expect(project.ywamBase).toBe(project.team);
    }
  });

  it("a base é obrigatória para salvar", () => {
    expect(missingRequired({ ...makeEmptyProject() })).toContain("team");
    expect(
      missingRequired({ ...makeEmptyProject(), team: "   " }),
    ).toContain("team");
    expect(
      missingRequired({ ...makeEmptyProject(), team: "JOCUM Aurora" }),
    ).not.toContain("team");
  });

  it("escrever a base mantém os dois campos casados no rascunho", () => {
    const { updateDraft } = useRecordStore.getState();
    updateDraft(NEW_RECORD, { team: "JOCUM Belém" });
    updateDraft(NEW_RECORD, { ywamBase: "JOCUM Belém" });

    const draft = useRecordStore.getState().drafts[NEW_RECORD];
    expect(draft.ywamBase).toBe(draft.team);
  });
});

describe("a aba é composta quando as pessoas opcionais faltam", () => {
  it("há projeto real sem líder, sem tradutor e sem revisor", () => {
    const bare = projects.filter(
      (project) =>
        !project.teamLeader &&
        !project.translators &&
        !project.technicalReviewers,
    );
    expect(bare.length).toBeGreaterThan(0);
  });

  it("uma ficha nova não traz nenhuma pessoa preenchida", () => {
    const empty = makeEmptyProject();
    expect(empty.teamLeader).toBe("");
    expect(empty.translators).toBe("");
    expect(empty.technicalReviewers).toBe("");
    expect(splitPeople(empty.translators)).toEqual([]);
  });

  it("o contato da equipe é dado real que o registro já carrega", () => {
    const withContact = projects.filter((project) =>
      project.teamContact.trim(),
    );
    expect(withContact.length).toBeGreaterThan(100);
  });
});
