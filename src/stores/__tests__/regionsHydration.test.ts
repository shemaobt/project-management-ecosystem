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

const forbidden = {
  isAxiosError: true,
  code: undefined,
  response: { status: 403, data: { detail: "not a coordinator" } },
  config: {},
};

const seatChange = {
  regionKey: "south-america" as const,
  role: "coordinator" as const,
  from: "",
  to: "Ana Beatriz Rocha",
  changedBy: "Karina Marinho",
  changedAt: "2026-05-14",
};

beforeEach(() => {
  useRegionsStore.setState({ regions: [], changes: [], hydrated: false });
  storage.clear();
  vi.restoreAllMocks();
});

describe("hydrate() já não pede a trilha de trocas", () => {
  it("chama regionsAPI.list() e nunca regionsAPI.roleChanges()", async () => {
    const listSpy = vi.spyOn(regionsAPI, "list");
    const changesSpy = vi.spyOn(regionsAPI, "roleChanges");

    await useRegionsStore.getState().hydrate();

    expect(listSpy).toHaveBeenCalledTimes(1);
    expect(changesSpy).not.toHaveBeenCalled();
    expect(useRegionsStore.getState().hydrated).toBe(true);
  });
});

describe("hydrateChanges() pede a trilha sozinha, e uma recusa não derruba a tela", () => {
  it("um 403 mantém o `changes` anterior e a promessa resolve", async () => {
    useRegionsStore.setState({ changes: [seatChange] });
    vi.spyOn(regionsAPI, "roleChanges").mockRejectedValue(forbidden);

    await expect(
      useRegionsStore.getState().hydrateChanges(),
    ).resolves.toBeUndefined();

    expect(useRegionsStore.getState().changes).toEqual([seatChange]);
  });
});
