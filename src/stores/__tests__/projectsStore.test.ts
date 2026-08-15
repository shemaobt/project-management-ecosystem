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

const { createEmptyProject } = await import("../../fixtures/blank");
const { useProjectsStore } = await import("../projectsStore");

const imported = (id: string, languageName: string) => ({
  ...createEmptyProject(id),
  languageName,
});

beforeEach(() => {
  storage.clear();
  useProjectsStore.setState({ projects: [], hydrated: false });
});

describe("importProjects", () => {
  it("substitui a coleção inteira — nada do estado anterior sobrevive", async () => {
    await useProjectsStore.getState().hydrate();
    const before = useProjectsStore.getState().projects;
    expect(before.length).toBeGreaterThan(0);

    useProjectsStore
      .getState()
      .importProjects([imported("novo", "Kadiwéu"), imported("outro", "Tikuna")]);

    const after = useProjectsStore.getState().projects;
    expect(after.map((project) => project.id)).toEqual(["novo", "outro"]);
    expect(after).not.toContainEqual(before[0]);
    expect(useProjectsStore.getState().hydrated).toBe(true);
  });

  it("persiste a coleção importada", () => {
    useProjectsStore.getState().importProjects([imported("novo", "Kadiwéu")]);

    const persisted = JSON.parse(storage.getItem("shema-projects-v1") ?? "{}");
    expect(
      persisted.state.projects.map((project: { id: string }) => project.id),
    ).toEqual(["novo"]);
  });
});

describe("reload", () => {
  it("volta a ler a camada de fixtures, descartando edições locais", async () => {
    await useProjectsStore.getState().hydrate();
    const fixtureCount = useProjectsStore.getState().projects.length;

    useProjectsStore.getState().importProjects([imported("so-um", "Kadiwéu")]);
    expect(useProjectsStore.getState().projects).toHaveLength(1);

    await useProjectsStore.getState().reload();

    expect(useProjectsStore.getState().projects).toHaveLength(fixtureCount);
    expect(
      useProjectsStore
        .getState()
        .projects.find((project) => project.id === "so-um"),
    ).toBeUndefined();
  });

  it("recarrega mesmo já hidratado — é refetch, não cache", async () => {
    await useProjectsStore.getState().hydrate();
    const saved = {
      ...useProjectsStore.getState().projects[0],
      languageName: "Editada localmente",
    };
    useProjectsStore.getState().saveProject(saved);
    expect(useProjectsStore.getState().projects[0].languageName).toBe(
      "Editada localmente",
    );

    await useProjectsStore.getState().reload();

    expect(useProjectsStore.getState().projects[0].languageName).not.toBe(
      "Editada localmente",
    );
  });
});
