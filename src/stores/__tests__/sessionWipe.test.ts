import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * What a session leaves in this browser goes with it (INT-12 · OBT-417). A shared or borrowed
 * device is the normal case in the field: the next person to sign in must not inherit the
 * previous reader's projects, submissions, org chart, intercessors or unsent drafts.
 */
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
    raw: data,
  };
}

const storage = createMemoryStorage();
const tabStorage = createMemoryStorage();
vi.stubGlobal("localStorage", storage);
vi.stubGlobal("sessionStorage", tabStorage);
vi.stubGlobal("window", { localStorage: storage, sessionStorage: tabStorage });

const { storesWipedOn } = await import("../sessionWipe");
const { forgetTokens, setTokens } = await import("../../services/api/tokens");
const { useProjectsStore } = await import("../projectsStore");
const { useFiltersStore } = await import("../filtersStore");
const { makeProject } = await import("../../utils/__tests__/factory");

beforeEach(() => {
  storage.clear();
  tabStorage.clear();
});

describe("o que a sessão deixa no navegador", () => {
  it("sair por escolha leva o lido e o digitado; expirar leva só o lido", () => {
    expect(storesWipedOn("signedOut")).toHaveLength(8);
    expect(storesWipedOn("expired")).toHaveLength(4);
    expect(storesWipedOn("signedIn")).toHaveLength(0);
  });

  it("ao sair, a lista de projetos some da memória e do armazenamento", () => {
    setTokens({ accessToken: "a", refreshToken: "r" });
    useProjectsStore.setState({ projects: [makeProject({ id: "tikuna" })], hydrated: true });
    expect(storage.raw.get("shema-projects-v1")).toContain("tikuna");

    forgetTokens("signedOut");

    expect(useProjectsStore.getState().projects).toEqual([]);
    expect(useProjectsStore.getState().hydrated).toBe(false);
    expect(storage.raw.get("shema-projects-v1") ?? "").not.toContain("tikuna");
  });

  it("uma expiração mantém o que a pessoa digitou e não enviou", () => {
    setTokens({ accessToken: "a", refreshToken: "r" });
    useFiltersStore.setState({ search: "Morelia" });

    forgetTokens("expired");

    expect(useFiltersStore.getState().search).toBe("Morelia");
  });
});
