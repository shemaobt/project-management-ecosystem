import axios, { type InternalAxiosRequestConfig } from "axios";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../services/api/source", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("../../services/api/source")>();
  return { ...actual, resolveSource: () => "api" as const };
});

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
const tabStorage = createMemoryStorage();
vi.stubGlobal("localStorage", storage);
vi.stubGlobal("sessionStorage", tabStorage);
vi.stubGlobal("window", { localStorage: storage, sessionStorage: tabStorage });

const { http } = await import("../../services/api/client");
const { usePrayerStore } = await import("../prayerStore");

let status = 403;
const adapter = async (config: InternalAxiosRequestConfig) => {
  const response = {
    data: status === 200 ? { people: [], withheldCount: 0, withheldReviewDueCount: 0 } : null,
    status,
    statusText: "",
    headers: {},
    config,
  };
  if (status === 200) return response;
  throw { isAxiosError: true, code: "ERR_BAD_REQUEST", config, response };
};
http.defaults.adapter = adapter;
axios.defaults.adapter = adapter;

beforeEach(() => {
  tabStorage.clear();
  usePrayerStore.setState({
    intercessors: [],
    forbidden: false,
    withheldCount: 0,
    withheldReviewDueCount: 0,
    hydrated: false,
    loading: false,
    error: null,
  });
});

describe("o 403 de /prayer/intercessors", () => {
  it("termina a leitura como acesso negado: sai do carregando e fica assim", async () => {
    status = 403;

    await usePrayerStore.getState().reload();

    const state = usePrayerStore.getState();
    expect(state.hydrated).toBe(true);
    expect(state.loading).toBe(false);
    expect(state.forbidden).toBe(true);
    expect(state.error).toBeNull();
    expect(state.intercessors).toEqual([]);
  });

  it("uma leitura que volta a funcionar desfaz o acesso negado", async () => {
    status = 403;
    await usePrayerStore.getState().reload();
    status = 200;

    await usePrayerStore.getState().reload();

    expect(usePrayerStore.getState().forbidden).toBe(false);
  });

  it("uma falha de servidor não é lida como acesso negado", async () => {
    status = 500;

    await usePrayerStore.getState().reload();

    const state = usePrayerStore.getState();
    expect(state.forbidden).toBe(false);
    expect(state.hydrated).toBe(false);
    expect(state.error?.kind).toBe("server");
  });
});
