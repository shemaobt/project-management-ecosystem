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

const { useRegionsStore } = await import("../regionsStore");
const { regionsAPI } = await import("../../fixtures");
const { RITMO_MEETINGS } = await import("../../constants/meetings");
const { MOCK_SESSION_PERSONAS, resolvePersonaName } = await import(
  "../../contexts/AuthContext"
);
const { buildRegionPanel, resolveProjectRoles } = await import(
  "../../utils/region"
);
const { resolveMeetingParticipants } = await import("../../utils/rhythm");
const { draftsFor } = await import("../../utils/team");
const { createEmptyProject } = await import("../../fixtures/blank");

const NOW = new Date(2026, 4, 14);
const SEE_ALL = () => true;

const peruvian = {
  ...createEmptyProject("ashaninka"),
  languageName: "Asháninka",
  location: "Peru",
};

async function saveHolder(name: string, role = "coordinator" as const) {
  await useRegionsStore.getState().hydrate();
  const drafts = draftsFor(useRegionsStore.getState().regions);
  const draft = drafts["south-america"];
  if (!draft) throw new Error("a América do Sul não veio nas regiões");
  draft[role] = name;
  return useRegionsStore.getState().saveTeams(drafts, "Karina Marinho", NOW);
}

beforeEach(() => {
  useRegionsStore.setState({ regions: [], changes: [], hydrated: false });
  storage.clear();
});

describe("um nome salvo aqui chega aos quatro consumidores", () => {
  it("aparece no Time por região da barra lateral", async () => {
    await saveHolder("Ana Beatriz Rocha");
    const { regions } = useRegionsStore.getState();

    const card = buildRegionPanel([peruvian], regions, SEE_ALL).find(
      (entry) => entry.key === "south-america",
    );

    expect(card?.team.coordinator).toBe("Ana Beatriz Rocha");
  });

  it("aparece na aba Equipe da ficha de um projeto da região", async () => {
    await saveHolder("Ana Beatriz Rocha");
    const { regions } = useRegionsStore.getState();

    const holder = resolveProjectRoles(peruvian, regions).find(
      (role) => role.key === "coordinator",
    );

    expect(holder?.holder).toBe("Ana Beatriz Rocha");
  });

  it("aparece no cartão de uma reunião do Ritmo", async () => {
    await saveHolder("Ana Beatriz Rocha");
    const { regions } = useRegionsStore.getState();
    const meeting = RITMO_MEETINGS.find((entry) =>
      entry.roles.includes("coordinator"),
    );

    expect(meeting).toBeDefined();
    const participant = resolveMeetingParticipants(
      meeting!,
      "south-america",
      regions,
    ).find((entry) => entry.key === "coordinator");

    expect(participant?.holder).toBe("Ana Beatriz Rocha");
  });

  it("aparece na identidade da sessão de quem tem esse papel na região", async () => {
    await saveHolder("Ana Beatriz Rocha");
    const { regions } = useRegionsStore.getState();

    expect(
      resolvePersonaName(MOCK_SESSION_PERSONAS.coordinator, regions),
    ).toBe("Ana Beatriz Rocha");
  });
});

describe("nenhum consumidor guarda cópia, e a fixture não é reescrita", () => {
  it("todos são função das regiões: trocar o nome de novo troca em todos", async () => {
    await saveHolder("Primeiro Nome");
    await saveHolder("Segundo Nome");
    const { regions } = useRegionsStore.getState();

    expect(
      buildRegionPanel([peruvian], regions, SEE_ALL).find(
        (entry) => entry.key === "south-america",
      )?.team.coordinator,
    ).toBe("Segundo Nome");
    expect(
      resolveProjectRoles(peruvian, regions).find(
        (role) => role.key === "coordinator",
      )?.holder,
    ).toBe("Segundo Nome");
    expect(
      resolvePersonaName(MOCK_SESSION_PERSONAS.coordinator, regions),
    ).toBe("Segundo Nome");
  });

  it("a fixture continua intacta — quem passou a mandar é a store", async () => {
    await saveHolder("Ana Beatriz Rocha");

    const fresh = await regionsAPI.list();
    expect(
      fresh.find((region) => region.key === "south-america")?.team.coordinator,
    ).toBe("");
  });

  it("hidratar de novo não ressuscita o nome antigo", async () => {
    await saveHolder("Ana Beatriz Rocha");
    await useRegionsStore.getState().hydrate();

    expect(
      useRegionsStore
        .getState()
        .regions.find((region) => region.key === "south-america")?.team
        .coordinator,
    ).toBe("Ana Beatriz Rocha");
  });
});

describe("trocar quem ocupa um papel é evento, não edição de texto", () => {
  it("registra o antes, o depois, quem trocou e quando", async () => {
    await saveHolder("Ana Beatriz Rocha");
    const [change] = useRegionsStore.getState().changes;

    expect(change).toMatchObject({
      regionKey: "south-america",
      role: "coordinator",
      from: "",
      to: "Ana Beatriz Rocha",
      changedBy: "Karina Marinho",
      changedAt: "2026-05-14",
    });
  });

  it("o registro é retrato: uma troca depois não reescreve a anterior", async () => {
    await saveHolder("Primeira Pessoa");
    await saveHolder("Segunda Pessoa");
    const { changes } = useRegionsStore.getState();

    expect(changes).toHaveLength(2);
    expect(changes[0].to).toBe("Primeira Pessoa");
    expect(changes[1].from).toBe("Primeira Pessoa");
    expect(changes[1].to).toBe("Segunda Pessoa");
  });

  it("salvar sem mudar nada não inventa evento", async () => {
    await saveHolder("Ana Beatriz Rocha");
    const outcome = await useRegionsStore
      .getState()
      .saveTeams(
        draftsFor(useRegionsStore.getState().regions),
        "Alguém",
        NOW,
      );

    expect(outcome.outcome.changed).toBe(0);
    expect(useRegionsStore.getState().changes).toHaveLength(1);
  });

  it("esvaziar um papel também é evento, e volta a ser sem responsável", async () => {
    await saveHolder("Ana Beatriz Rocha");
    const outcome = await saveHolder("");

    expect(outcome.outcome.cleared).toBe(1);
    expect(
      resolvePersonaName(
        MOCK_SESSION_PERSONAS.coordinator,
        useRegionsStore.getState().regions,
      ),
    ).toBeNull();
  });
});

describe("uma região recusada não some com o nome digitado nas outras", () => {
  it("a região que falhou volta em failedRegions; a que passou aplica normalmente", async () => {
    await useRegionsStore.getState().hydrate();
    const drafts = draftsFor(useRegionsStore.getState().regions);
    const south = drafts["south-america"];
    const africa = drafts.africa;
    if (!south || !africa) throw new Error("as regiões não vieram");
    south.coordinator = "Ana Beatriz Rocha";
    africa.coordinator = "Josué";

    const original = regionsAPI.saveTeam.bind(regionsAPI);
    const spy = vi
      .spyOn(regionsAPI, "saveTeam")
      .mockImplementation((regionKey, from, to, changedBy, changedAt) => {
        if (regionKey === "africa") {
          return Promise.reject(new Error("network down"));
        }
        return original(regionKey, from, to, changedBy, changedAt);
      });

    const { outcome, failedRegions } = await useRegionsStore
      .getState()
      .saveTeams(drafts, "Karina Marinho", NOW);

    spy.mockRestore();

    expect(failedRegions).toEqual(["africa"]);
    expect(outcome.changed).toBe(1);

    const { regions } = useRegionsStore.getState();
    expect(
      regions.find((region) => region.key === "south-america")?.team
        .coordinator,
    ).toBe("Ana Beatriz Rocha");
    expect(
      regions.find((region) => region.key === "africa")?.team.coordinator,
    ).toBe("");
  });
});
