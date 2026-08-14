import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

vi.mock("../../../../stores/prefsStore", () => {
  const state = { sort: "name", metaphor: "diario", lang: "pt" };
  const usePrefsStore = Object.assign(
    <T,>(selector: (current: typeof state) => T): T => selector(state),
    {
      getState: () => state,
      subscribe: () => () => undefined,
    },
  );
  return { usePrefsStore };
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
vi.stubGlobal("localStorage", storage);
vi.stubGlobal("window", { localStorage: storage });

await import("../../../../i18n");
const { IndicatorBand } = await import("../IndicatorBand");

describe("o link do indicador carrega as prefs do leitor", () => {
  it("vista e ordenação não default viajam na URL, e o filtro continua o mesmo", () => {
    const markup = renderToStaticMarkup(
      createElement(
        MemoryRouter,
        null,
        createElement(IndicatorBand, { projects: [] }),
      ),
    );
    expect(markup).toContain("presets=attention");
    expect(markup).toContain("view=diario");
    expect(markup).toContain("sort=name");
    expect(markup).not.toContain("view=atlas");
  });
});
