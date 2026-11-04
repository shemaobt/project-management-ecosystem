import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

const store = {
  intercessors: [
    {
      id: "i1",
      name: "Ana Ribeiro",
      country: "BR",
      contactChannel: "email",
      addedAt: "2026-01-10",
    },
  ],
  withheldCount: 0,
  withheldReviewDueCount: 0,
  hydrated: true,
  forbidden: false,
  reload: async () => undefined,
  addIntercessor: async () => false,
  updateIntercessor: async () => false,
  removeIntercessor: async () => false,
  revealContact: async () => null,
  reviewIntercessor: async () => false,
  listWithheld: async () => ({ kind: "notFound" }),
};

vi.mock("../../../../stores/prayerStore", () => ({
  usePrayerStore: Object.assign(
    <T,>(selector: (current: typeof store) => T): T => selector(store),
    { getState: () => store, subscribe: () => () => undefined },
  ),
}));

vi.mock("../../../../contexts/AuthContext", () => ({
  useAuth: () => ({ user: { name: null, roles: [] } }),
}));

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

await import("../../../../i18n");
const { IntercessoresPage } = await import("../IntercessoresPage");

describe("a página da rede acredita no servidor, não no papel da sessão (OBT-598)", () => {
  it("uma sessão sem papel de leitura que o servidor atendeu vê a rede, não o acesso negado", () => {
    const html = renderToStaticMarkup(
      createElement(MemoryRouter, null, createElement(IntercessoresPage)),
    );
    expect(html).toContain("Ana Ribeiro");
    expect(html).not.toContain("não aparece para o seu papel");
  });
});
