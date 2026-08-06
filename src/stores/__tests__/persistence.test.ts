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

const { usePrefsStore } = await import("../prefsStore");
const { EMPTY_FILTERS, useFiltersStore } = await import("../filtersStore");

const readStored = (key: string) => {
  const raw = storage.getItem(key);
  return raw ? JSON.parse(raw) : null;
};

beforeEach(() => {
  storage.clear();
  usePrefsStore.setState({ metaphor: "atlas", lang: "pt" });
  useFiltersStore.setState({ filters: { ...EMPTY_FILTERS }, search: "" });
});

describe("prefs store", () => {
  it("persists the chosen view under the prototype's prefs key", () => {
    usePrefsStore.getState().setMetaphor("diario");
    expect(readStored("shema-prefs-v1").state.metaphor).toBe("diario");
  });

  it("persists the language toggle", () => {
    usePrefsStore.getState().toggleLang();
    expect(usePrefsStore.getState().lang).toBe("en");
    expect(readStored("shema-prefs-v1").state.lang).toBe("en");
  });

  it("rehydrates the persisted view after a reload", async () => {
    storage.setItem(
      "shema-prefs-v1",
      JSON.stringify({ state: { metaphor: "coral", lang: "en" }, version: 0 }),
    );
    await usePrefsStore.persist.rehydrate();
    expect(usePrefsStore.getState().metaphor).toBe("coral");
    expect(usePrefsStore.getState().lang).toBe("en");
  });
});

describe("filters store", () => {
  it("persists filters and search", () => {
    useFiltersStore.getState().setFilter("status", "em-andamento");
    useFiltersStore.getState().togglePreset("attention");
    useFiltersStore.getState().setSearch("Waima");
    const stored = readStored("shema-filters-v1").state;
    expect(stored.filters.status).toBe("em-andamento");
    expect(stored.filters.attention).toBe(true);
    expect(stored.search).toBe("Waima");
  });

  it("rehydrates persisted filters after a reload", async () => {
    storage.setItem(
      "shema-filters-v1",
      JSON.stringify({
        state: {
          filters: { ...EMPTY_FILTERS, continent: "africa", prayer: true },
          search: "Egypt",
        },
        version: 0,
      }),
    );
    await useFiltersStore.persist.rehydrate();
    expect(useFiltersStore.getState().filters.continent).toBe("africa");
    expect(useFiltersStore.getState().filters.prayer).toBe(true);
    expect(useFiltersStore.getState().search).toBe("Egypt");
  });

  it("clears every filter at once", () => {
    useFiltersStore.getState().setFilter("health", "critica");
    useFiltersStore.getState().togglePreset("recent");
    useFiltersStore.getState().clearAll();
    expect(useFiltersStore.getState().filters).toEqual(EMPTY_FILTERS);
  });
});
