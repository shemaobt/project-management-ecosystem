import { beforeEach, describe, expect, it, vi } from "vitest";

/*
 * OBT-505 — the dark palette is ours and waits for the client (§7.4), so it is something a person
 * picks, never something inherited from the operating system: a stored choice wins, and with none
 * the record opens light even where the system asks for dark.
 */

const stored = new Map<string, string>();
const classes = new Set<string>();
let systemDark = false;

vi.stubGlobal("localStorage", {
  getItem: (key: string) => stored.get(key) ?? null,
  setItem: (key: string, value: string) => void stored.set(key, value),
  removeItem: (key: string) => void stored.delete(key),
});
vi.stubGlobal("window", { matchMedia: () => ({ matches: systemDark }) });
vi.stubGlobal("document", {
  documentElement: {
    classList: {
      toggle: (name: string, on: boolean) => (on ? classes.add(name) : classes.delete(name)),
    },
  },
});

const { applyStoredTheme } = await import("../ThemeContext");

describe("o tema escuro é escolha de quem clica (OBT-505)", () => {
  beforeEach(() => {
    stored.clear();
    classes.clear();
    systemDark = false;
  });

  it("sem escolha guardada, abre claro mesmo com o sistema escuro", () => {
    systemDark = true;
    applyStoredTheme();
    expect(classes.has("dark")).toBe(false);
  });

  it("a escolha guardada vale antes da primeira pintura", () => {
    stored.set("shema-theme-v1", "dark");
    applyStoredTheme();
    expect(classes.has("dark")).toBe(true);
  });

  it("quem escolheu seguir o sistema continua seguindo", () => {
    stored.set("shema-theme-v1", "system");
    systemDark = true;
    applyStoredTheme();
    expect(classes.has("dark")).toBe(true);
  });
});
