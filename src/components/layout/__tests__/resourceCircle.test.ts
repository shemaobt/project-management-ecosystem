import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SessionRole } from "../../../types/session";

vi.mock("../../../services/api", async (importOriginal) => {
  const original = await importOriginal<typeof import("../../../services/api")>();
  const never = () => new Promise<never>(() => undefined);
  return {
    ...original,
    resourceRequestsAPI: {
      projectRequests: never,
      links: never,
      issueLink: never,
      revokeLink: never,
    },
  };
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

const { default: i18n } = await import("../../../i18n");
const { AuthContext } = await import("../../../contexts/session");
const { AppShell } = await import("../AppShell");

const FORM = "https://formulario.exemplo.org";

const AREAS = [
  ["/projetos", "nav_projetos"],
  ["/ritmo", "nav_ritmo"],
  ["/oracao", "nav_oracao"],
  ["/eten", "nav_eten"],
  ["/formularios", "nav_formularios"],
  ["/equipe", "nav_equipe"],
] as const;

const DATA_ACTIONS = ["btn_field", "btn_export", "btn_import", "btn_reload", "btn_intake", "btn_new"];

const INICIO = "CONTEUDO-DO-INICIO";

function visit(roles: SessionRole[], form: string | null = FORM): string {
  const value = {
    status: "ready" as const,
    user: {
      id: "u-1",
      role: roles[0],
      roles,
      regionScope: [],
      name: null,
    },
    apps: { resourceRequestForm: form },
    visibleRegions: [],
    canSeeRegion: () => false,
    signIn: async () => undefined,
    signOut: async () => undefined,
    switchRole: null,
    failure: null,
  };
  return renderToStaticMarkup(
    createElement(
      MemoryRouter,
      { initialEntries: ["/"] },
      createElement(
        AuthContext.Provider,
        { value },
        createElement(
          Routes,
          null,
          createElement(
            Route,
            { element: createElement(AppShell) },
            createElement(Route, { index: true, element: createElement("p", null, INICIO) }),
          ),
        ),
      ),
    ),
  );
}

const entryOf = (html: string) => html.includes(i18n.t("rr_opens_new_tab"));

const areasOf = (html: string) =>
  AREAS.filter(([href, key]) => html.includes(`href="${href}"`) || html.includes(`>${i18n.t(key)}<`));

beforeEach(async () => {
  await i18n.changeLanguage("pt");
});

describe("conta só do formulário — render por papel", () => {
  for (const role of ["mesa", "gestor"] as const) {
    it(`${role} vê a topbar e o Círculo de Recursos, e nenhuma das seis áreas`, () => {
      const html = visit([role]);
      expect(html).toContain("<header");
      expect(html).toContain(i18n.t("entrar_signout"));
      expect(entryOf(html)).toBe(true);
      expect(html).toContain(i18n.t("ritmo_role_resourcecircle"));
      expect(areasOf(html)).toEqual([]);
    });

    it(`${role} não recebe as ações de dados do cabeçalho nem o Início do PME`, () => {
      const html = visit([role]);
      for (const key of DATA_ACTIONS) {
        expect(html, key).not.toContain(i18n.t(key));
      }
      expect(html).not.toContain(INICIO);
      expect(html).toContain(i18n.t("rr_home_title"));
      expect(html).not.toContain(i18n.t("rr_link_btn"));
    });
  }

  it("mesa e gestor juntos continuam só do formulário", () => {
    const html = visit(["gestor", "mesa"]);
    expect(areasOf(html)).toEqual([]);
    expect(entryOf(html)).toBe(true);
  });

  it("sem o endereço do formulário, a entrada some e o aviso diz por quê", () => {
    const html = visit(["mesa"], null);
    expect(entryOf(html)).toBe(false);
    expect(html).toContain(i18n.t("rr_form_unavailable", { admin: i18n.t("role_admin") }));
    expect(areasOf(html)).toEqual([]);
  });
});

describe("quem tem papel no PME continua com as seis áreas", () => {
  it("a coordenação vê as seis áreas e o Início, e nenhuma entrada do formulário", () => {
    const html = visit(["coordinator"]);
    expect(areasOf(html).map(([href]) => href)).toEqual(AREAS.map(([href]) => href));
    expect(entryOf(html)).toBe(false);
    expect(html).toContain(INICIO);
    for (const key of DATA_ACTIONS) {
      expect(html, key).toContain(i18n.t(key));
    }
  });

  it("o Admin de hoje (estrategista, admin, gestor) vê as seis áreas, a entrada e o link externo", () => {
    const html = visit(["globalStrategist", "admin", "gestor"]);
    expect(areasOf(html)).toHaveLength(6);
    expect(entryOf(html)).toBe(true);
    expect(html).toContain(i18n.t("rr_link_btn"));
    expect(html).toContain(INICIO);
  });

  it("coordenação que também é mesa vê as seis áreas e a entrada", () => {
    const html = visit(["coordinator", "mesa"]);
    expect(areasOf(html)).toHaveLength(6);
    expect(entryOf(html)).toBe(true);
    expect(html).not.toContain(i18n.t("rr_link_btn"));
  });
});

describe("o link de solicitação externa é só do Admin", () => {
  it("nenhum dos outros sete papéis vê o botão no cabeçalho", () => {
    for (const role of [
      "globalStrategist",
      "coordinator",
      "obtLab",
      "resourceCircle",
      "gestor",
      "mesa",
      "equipe",
    ] as const) {
      expect(visit([role]), role).not.toContain(i18n.t("rr_link_btn"));
    }
    expect(visit(["admin"])).toContain(i18n.t("rr_link_btn"));
  });
});

describe("o endereço do formulário vem da sessão, nunca de uma constante", () => {
  it("nenhum arquivo que vai para o ar escreve o host do formulário", () => {
    const shipped = [
      "src/utils/requests.ts",
      "src/hooks/useResourceForm.ts",
      "src/components/layout/TopNav.tsx",
      "src/components/layout/ResourceCircleEntry.tsx",
      "src/components/pages/ficha/pedidos/ProjectRequests.tsx",
      "src/components/pages/dados/RequestLinkDialog.tsx",
      "src/services/api/resourceRequests.ts",
      "src/constants/requests.ts",
    ];
    for (const path of shipped) {
      const source = readFileSync(join(process.cwd(), path), "utf8");
      expect(source, path).not.toMatch(/https?:\/\//u);
      expect(source, path).not.toMatch(/shemaywam|\.exemplo\.|localhost/iu);
    }
  });

  it("a entrada e a ficha abrem com a base que a sessão entregou", () => {
    const nav = readFileSync(join(process.cwd(), "src/components/layout/TopNav.tsx"), "utf8");
    expect(nav).toContain("apps.resourceRequestForm");
    const dialog = readFileSync(
      join(process.cwd(), "src/components/layout/AppHeader.tsx"),
      "utf8",
    );
    expect(dialog).toContain("formBase={apps.resourceRequestForm}");
  });
});
