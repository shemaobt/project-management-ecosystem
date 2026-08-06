import { describe, expect, it, vi } from "vitest";

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

describe("<html lang> on load", () => {
  it("follows the persisted language before any toggle", async () => {
    const storage = createMemoryStorage();
    storage.setItem(
      "shema-prefs-v1",
      JSON.stringify({ state: { metaphor: "atlas", lang: "en" }, version: 0 }),
    );
    vi.stubGlobal("localStorage", storage);
    vi.stubGlobal("window", { localStorage: storage });
    const documentStub = { documentElement: { lang: "pt-BR" } };
    vi.stubGlobal("document", documentStub);

    await import("../index");

    expect(documentStub.documentElement.lang).toBe("en-US");
  });
});
