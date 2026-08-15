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

const { NOTIF_DEFAULTS } = await import("../../constants/notifications");
const { useNotificationStore } = await import("../notificationStore");

const KEY = "shema-notifications-v1";

const reset = () => {
  storage.clear();
  useNotificationStore.setState({
    prefs: structuredClone(NOTIF_DEFAULTS),
    readIds: [],
  });
};

const persisted = () => storage.getItem(KEY) ?? "";

describe("as preferências são operações, e cada uma persiste", () => {
  beforeEach(reset);

  it("liga e desliga o aviso mestre", () => {
    useNotificationStore.getState().setEnabled(false);

    expect(useNotificationStore.getState().prefs.enabled).toBe(false);
    expect(persisted()).toContain('"enabled":false');
  });

  it("alterna um canal sem tocar nos outros", () => {
    useNotificationStore.getState().toggleChannel("whatsapp");

    const { channels } = useNotificationStore.getState().prefs;
    expect(channels).toEqual({ email: true, push: true, whatsapp: true });
  });

  it("guarda quando avisar e quais projetos", () => {
    useNotificationStore.getState().setWhen("urgent");
    useNotificationStore.getState().setScope("mentored");

    expect(useNotificationStore.getState().prefs.when).toBe("urgent");
    expect(useNotificationStore.getState().prefs.scope).toBe("mentored");
  });

  it("a lista personalizada entra e sai projeto a projeto", () => {
    useNotificationStore.getState().toggleCustomProject("p1");
    useNotificationStore.getState().toggleCustomProject("p2");
    useNotificationStore.getState().toggleCustomProject("p1");

    expect(useNotificationStore.getState().prefs.customProjectIds).toEqual([
      "p2",
    ]);
  });
});

describe("o estado de leitura sobrevive ao recarregamento", () => {
  beforeEach(reset);

  it("marcar como lida persiste no navegador", () => {
    useNotificationStore.getState().markRead(["health:a:2026-08-10"]);

    expect(persisted()).toContain("health:a:2026-08-10");
  });

  it("uma nova sessão reidrata o que foi lido", async () => {
    useNotificationStore.getState().markRead(["health:a:2026-08-10"]);
    const saved = persisted();

    useNotificationStore.setState({ readIds: [] });
    storage.setItem(KEY, saved);
    await useNotificationStore.persist.rehydrate();

    expect(useNotificationStore.getState().readIds).toEqual([
      "health:a:2026-08-10",
    ]);
  });

  it("marcar de novo não duplica, e o limite segura o crescimento", () => {
    useNotificationStore.getState().markRead(["a", "b"]);
    useNotificationStore.getState().markRead(["b", "c"]);

    expect(useNotificationStore.getState().readIds).toEqual(["a", "b", "c"]);

    useNotificationStore
      .getState()
      .markRead(Array.from({ length: 250 }, (_, index) => `id${index}`));

    expect(useNotificationStore.getState().readIds).toHaveLength(200);
  });
});
