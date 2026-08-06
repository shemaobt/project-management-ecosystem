import { beforeEach, describe, expect, it, vi } from "vitest";
import en from "../locales/en.json";
import ptBR from "../locales/pt-BR.json";
import rawProjects from "../../fixtures/data/projects.json";

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

const { usePrefsStore } = await import("../../stores/prefsStore");
const { default: i18n } = await import("../index");
const { formatDate, formatNumber } = await import("../../utils/format");

const RETIRED_ROLE_NAMES = [
  ["Global", "Articulator"].join(" "),
  ["Articulador", "Geral"].join(" "),
  ["Regional", "Host"].join(" "),
  ["International", "Project", "Facilitator"].join(" "),
  ["Financial", "Resource", "Mobilizer"].join(" "),
];

const FIELD_SAMPLES = [
  "Waima’a",
  "Ngäbere",
  "Oração: chuva forte levou o telhado. Equipe abrigada na base YWAM.",
];

beforeEach(async () => {
  storage.clear();
  usePrefsStore.setState({ metaphor: "atlas", lang: "pt" });
  await i18n.changeLanguage("pt");
});

describe("catalogues", () => {
  it("carries the same keys in PT and EN", () => {
    expect(Object.keys(en).sort()).toEqual(Object.keys(ptBR).sort());
  });

  it("never ships an empty string", () => {
    for (const catalogue of [ptBR, en]) {
      for (const [key, value] of Object.entries(catalogue)) {
        expect(typeof value, key).toBe("string");
        expect(value.length, key).toBeGreaterThan(0);
      }
    }
  });

  it("contains no retired role name in either catalogue", () => {
    for (const catalogue of [ptBR, en]) {
      for (const term of RETIRED_ROLE_NAMES) {
        const offenders = Object.entries(catalogue)
          .filter(([, value]) => value.includes(term))
          .map(([key]) => `${key} contains "${term}"`);
        expect(offenders).toEqual([]);
      }
    }
  });

  it("names the roles with the approved vocabulary in both languages", () => {
    expect(ptBR.role_coordinator).toBe("Administrador");
    expect(en.role_coordinator).toBe("Administrator");
    expect(ptBR.role_obtlab).toBe("Operacional de Línguas");
    expect(en.role_obtlab).toBe("Language Operations");
    expect(ptBR.role_resource).toBe("Intercessor");
    expect(en.role_resource).toBe("Intercessor");
    expect(ptBR.equipe_global).toBe("Estrategista Global");
    expect(en.equipe_global).toBe("Global Strategist");
  });
});

describe("language toggle", () => {
  it("switches i18next when the store toggles and persists the choice", async () => {
    expect(i18n.t("nav_projetos")).toBe("Projetos");
    usePrefsStore.getState().toggleLang();
    await vi.waitFor(() => expect(i18n.language).toBe("en"));
    expect(i18n.t("nav_projetos")).toBe("Projects");
    const stored = storage.getItem("shema-prefs-v1");
    expect(stored).not.toBeNull();
    expect(JSON.parse(stored as string).state.lang).toBe("en");
  });

  it("rehydrates the persisted language after a reload", async () => {
    storage.setItem(
      "shema-prefs-v1",
      JSON.stringify({ state: { metaphor: "atlas", lang: "en" }, version: 0 }),
    );
    await usePrefsStore.persist.rehydrate();
    await vi.waitFor(() => expect(i18n.language).toBe("en"));
    expect(i18n.t("sec_health")).toBe("Team Health");
  });
});

describe("interpolation and pluralisation", () => {
  it("renders 'Showing X of N' without concatenation", async () => {
    expect(i18n.t("sb_results_summary", { shown: 30, total: 127 })).toBe(
      "Mostrando 30 de 127",
    );
    await i18n.changeLanguage("en");
    expect(i18n.t("sb_results_summary", { shown: 30, total: 127 })).toBe(
      "Showing 30 of 127",
    );
  });

  it("pluralises the result count in both languages", async () => {
    expect(i18n.t("results_count", { count: 1 })).toBe("1 projeto");
    expect(i18n.t("results_count", { count: 127 })).toBe("127 projetos");
    await i18n.changeLanguage("en");
    expect(i18n.t("results_count", { count: 1 })).toBe("1 project");
    expect(i18n.t("results_count", { count: 127 })).toBe("127 projects");
  });
});

describe("locale-sensitive formatting", () => {
  it("formats dates per the active locale", async () => {
    expect(formatDate("2026-05-14")).toBe("14 de mai. de 2026");
    await i18n.changeLanguage("en");
    expect(formatDate("2026-05-14")).toBe("May 14, 2026");
  });

  it("keeps the em dash for absent dates", () => {
    expect(formatDate("")).toBe("—");
  });

  it("formats numbers per the active locale", async () => {
    expect(formatNumber(1234.5)).toBe("1.234,5");
    await i18n.changeLanguage("en");
    expect(formatNumber(1234.5)).toBe("1,234.5");
  });
});

describe("field data", () => {
  it("round-trips language names and notes unchanged in both locales", async () => {
    for (const lang of ["pt", "en"]) {
      await i18n.changeLanguage(lang);
      for (const sample of FIELD_SAMPLES) {
        expect(i18n.t(sample)).toBe(sample);
      }
    }
  });

  it("keeps every fixture language name out of the catalogue keys", () => {
    const keys = new Set([...Object.keys(ptBR), ...Object.keys(en)]);
    for (const project of rawProjects) {
      if (!project.languageName) continue;
      expect(keys.has(project.languageName), project.languageName).toBe(false);
    }
  });
});
