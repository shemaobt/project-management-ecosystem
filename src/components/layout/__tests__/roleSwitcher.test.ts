import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
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

const { default: i18n } = await import("../../../i18n");
const { AuthContext, NO_APPS } = await import("../../../contexts/session");
const { MOCK_SESSION_PERSONAS } = await import("../../../fixtures/session");
const { ROLE_DEFINITIONS } = await import("../../../constants/roles");
const { RoleSwitcher } = await import("../RoleSwitcher");

type AuthSession = NonNullable<Parameters<typeof AuthContext.Provider>[0]["value"]>;

const noop = async () => undefined;

function switcherFor(key: keyof typeof MOCK_SESSION_PERSONAS): string {
  const persona = MOCK_SESSION_PERSONAS[key];
  const value: AuthSession = {
    status: "ready",
    user: { ...persona, name: null },
    apps: NO_APPS,
    visibleRegions: [],
    canSeeRegion: () => true,
    signIn: noop,
    signOut: noop,
    switchRole: () => undefined,
    failure: null,
  };
  return renderToStaticMarkup(
    createElement(AuthContext.Provider, { value }, createElement(RoleSwitcher)),
  );
}

beforeEach(async () => {
  await i18n.changeLanguage("pt");
});

describe("o seletor da sessão mockada rotula a persona ativa (OBT-572)", () => {
  it("a persona Admin, que abre por coordinator, lê como Admin embaixo da pílula", () => {
    const html = switcherFor("admin");
    expect(MOCK_SESSION_PERSONAS.admin.role).toBe("coordinator");
    expect(html).toContain(`${i18n.t("role_admin")} ·`);
    expect(html).not.toContain(`${i18n.t(ROLE_DEFINITIONS.coordinator.labelKey)} ·`);
  });

  it("as outras personas leem pelo próprio papel, que é a chave", () => {
    for (const key of ["coordinator", "obtLab", "resourceCircle"] as const) {
      const html = switcherFor(key);
      expect(html, key).toContain(`${i18n.t(ROLE_DEFINITIONS[key].labelKey)} ·`);
    }
  });

  it("as quatro pílulas são as quatro personas, pela chave", () => {
    const html = switcherFor("admin");
    for (const key of ["admin", "coordinator", "obtLab", "resourceCircle"] as const) {
      const label = key === "admin" ? i18n.t("role_admin") : i18n.t(ROLE_DEFINITIONS[key].labelKey);
      expect(html, key).toContain(`>${label}</button>`);
    }
  });
});
