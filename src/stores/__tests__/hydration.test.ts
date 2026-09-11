import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ApiFailure } from "../../types/session";

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

const { createHydrationSlot, hydrateOnce, NOT_HYDRATED } =
  await import("../hydration");
const { failure, failureSentence, isAnnounceable, projectsAPI } =
  await import("../../services/api");
const { default: ptBR } = await import("../../i18n/locales/pt-BR.json");
const { useProjectsStore } = await import("../projectsStore");

interface Cell {
  hydrated: boolean;
  loading: boolean;
  error: ApiFailure | null;
  seen: Partial<Cell>[];
}

function cell() {
  const state: Cell = { ...NOT_HYDRATED, seen: [] };
  return {
    status: () => state,
    update: (partial: Partial<Cell>) => {
      state.seen.push(partial);
      Object.assign(state, partial);
    },
    state,
  };
}

const offline = () => ({
  code: "ERR_NETWORK",
  config: {},
  response: undefined,
});

beforeEach(() => {
  storage.clear();
  vi.restoreAllMocks();
  useProjectsStore.setState({ projects: [], ...NOT_HYDRATED });
});

describe("hidratar uma vez", () => {
  it("marca carregando, depois hidratado, e limpa a falha anterior", async () => {
    const host = cell();
    await hydrateOnce(
      createHydrationSlot(),
      host.status,
      host.update,
      async () => {},
    );
    expect(host.state.seen).toEqual([
      { loading: true, error: null },
      { hydrated: true, loading: false, error: null },
    ]);
  });

  it("não refaz a chamada quando já está hidratado", async () => {
    const host = cell();
    const slot = createHydrationSlot();
    const load = vi.fn(async () => {});
    await hydrateOnce(slot, host.status, host.update, load);
    await hydrateOnce(slot, host.status, host.update, load);
    expect(load).toHaveBeenCalledTimes(1);
  });

  it("refaz quando o chamador força — é isso que reload() é", async () => {
    const host = cell();
    const slot = createHydrationSlot();
    const load = vi.fn(async () => {});
    await hydrateOnce(slot, host.status, host.update, load);
    await hydrateOnce(slot, host.status, host.update, load, true);
    expect(load).toHaveBeenCalledTimes(2);
  });

  it("duas telas pedindo ao mesmo tempo fazem uma requisição só, e ambas esperam", async () => {
    const host = cell();
    const slot = createHydrationSlot();
    let release = () => {};
    const load = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          release = resolve;
        }),
    );

    const first = hydrateOnce(slot, host.status, host.update, load);
    const second = hydrateOnce(slot, host.status, host.update, load);
    expect(load).toHaveBeenCalledTimes(1);
    expect(host.state.loading).toBe(true);

    release();
    await Promise.all([first, second]);
    expect(host.state.hydrated).toBe(true);
    expect(load).toHaveBeenCalledTimes(1);
  });
});

describe("quando a rede falha", () => {
  it("a falha é classificada, guardada, e nunca lançada por cima da tela", async () => {
    const host = cell();
    await expect(
      hydrateOnce(createHydrationSlot(), host.status, host.update, () =>
        Promise.reject(offline()),
      ),
    ).resolves.toBeUndefined();

    expect(host.state.hydrated).toBe(false);
    expect(host.state.loading).toBe(false);
    expect(host.state.error).toEqual({
      kind: "offline",
      status: null,
      code: "ERR_NETWORK",
      detail: null,
    });
  });

  it("hidratado continua falso, então a tela não mostra lista vazia como verdade", async () => {
    const host = cell();
    const slot = createHydrationSlot();
    await hydrateOnce(slot, host.status, host.update, () =>
      Promise.reject(offline()),
    );
    const load = vi.fn(async () => {});
    await hydrateOnce(slot, host.status, host.update, load);
    expect(load).toHaveBeenCalledTimes(1);
    expect(host.state.error).toBeNull();
  });
});

describe("o que o coordenador lê quando uma leitura de fundo falha", () => {
  it("a frase anunciada é a do catálogo, nunca o nome da chave", () => {
    expect(failureSentence(failure("offline"))).toBe(ptBR.net_offline);
    expect(failureSentence(failure("timeout"))).toBe(ptBR.net_timeout);
    expect(failureSentence(failure("offline"))).not.toContain("net_");
  });

  it("um cancelamento não vira frase nenhuma na tela", () => {
    expect(isAnnounceable(failure("canceled"))).toBe(false);
    expect(isAnnounceable(failure("offline"))).toBe(true);
  });
});

describe("o store de projetos, pela costura real", () => {
  it("hidrata das fixtures e não guarda falha nenhuma", async () => {
    await useProjectsStore.getState().hydrate();
    const state = useProjectsStore.getState();
    expect(state.projects.length).toBeGreaterThan(100);
    expect(state).toMatchObject({
      hydrated: true,
      loading: false,
      error: null,
    });
  });

  it("uma leitura que falha deixa o store vazio, honesto e com o motivo", async () => {
    vi.spyOn(projectsAPI, "list").mockRejectedValue(offline());
    await useProjectsStore.getState().hydrate();
    const state = useProjectsStore.getState();
    expect(state.projects).toEqual([]);
    expect(state.hydrated).toBe(false);
    expect(state.error).toMatchObject({ kind: "offline" });
  });

  it("e reload() é o caminho de volta quando a rede voltar", async () => {
    const list = vi.spyOn(projectsAPI, "list").mockRejectedValue(offline());
    await useProjectsStore.getState().hydrate();
    expect(useProjectsStore.getState().error).not.toBeNull();

    list.mockRestore();
    await useProjectsStore.getState().reload();
    const state = useProjectsStore.getState();
    expect(state.hydrated).toBe(true);
    expect(state.error).toBeNull();
    expect(state.projects.length).toBeGreaterThan(100);
  });
});
