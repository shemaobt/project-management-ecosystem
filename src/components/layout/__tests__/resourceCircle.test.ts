import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { RegionKey } from "../../../types/region";
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
const { ThemeProvider } = await import("../../../contexts/ThemeContext");

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

function visit(
  roles: SessionRole[],
  form: string | null = FORM,
  writeRegionScope?: RegionKey[] | null,
): string {
  const value = {
    status: "ready" as const,
    user: {
      id: "u-1",
      role: roles[0],
      roles,
      regionScope: [],
      ...(writeRegionScope === undefined ? {} : { writeRegionScope }),
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
        ThemeProvider,
        null,
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
    expect(html).not.toContain("<nav");
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

  it("o Admin de hoje (admin, gestor) vê as seis áreas, a entrada e o link externo", () => {
    const html = visit(["admin", "gestor"]);
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
  it("nenhum dos outros seis papéis vê o botão no cabeçalho", () => {
    for (const role of [
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

describe("o botão Importar é só de quem importa (OBT-559)", () => {
  const importButton = (html: string) => html.includes(`${i18n.t("btn_import")}</button>`);

  it("a coordenação e o admin veem o botão", () => {
    for (const role of ["coordinator", "admin"] as const) {
      expect(importButton(visit([role])), role).toBe(true);
    }
  });

  it("OBT Lab não vê o Importar nem o Link do líder (OBT-620), e continua com as outras ações de dados", () => {
    const html = visit(["obtLab"]);
    expect(importButton(html)).toBe(false);
    expect(html).not.toContain(i18n.t("btn_intake"));
    for (const key of DATA_ACTIONS.filter((key) => key !== "btn_import" && key !== "btn_intake")) {
      expect(html, key).toContain(i18n.t(key));
    }
  });

  it("o Círculo de Recursos não vê o Importar, o Novo projeto (OBT-571) nem o Link do líder (OBT-620), e continua com o resto", () => {
    const html = visit(["resourceCircle"]);
    expect(importButton(html)).toBe(false);
    expect(html).not.toContain(i18n.t("btn_new"));
    expect(html).not.toContain(i18n.t("btn_intake"));
    const kept = DATA_ACTIONS.filter(
      (key) => key !== "btn_import" && key !== "btn_new" && key !== "btn_intake",
    );
    for (const key of kept) {
      expect(html, key).toContain(i18n.t(key));
    }
  });

  it("quem soma um papel que importa a um que não importa recebe o botão", () => {
    expect(importButton(visit(["obtLab", "coordinator"]))).toBe(true);
    expect(importButton(visit(["resourceCircle", "obtLab"]))).toBe(false);
  });
});

describe("o Link do líder é de quem o POST /intake-links admite (OBT-620)", () => {
  const intakeButton = (html: string) => html.includes(`${i18n.t("btn_intake")}</button>`);

  it("a coordenação que escreve vê o botão, com o campo presente ou ausente", () => {
    expect(intakeButton(visit(["coordinator"], FORM, ["south-america"]))).toBe(true);
    expect(intakeButton(visit(["coordinator"]))).toBe(true);
  });

  it("a coordenação sem região onde escrever não vê o botão", () => {
    expect(intakeButton(visit(["coordinator"], FORM, []))).toBe(false);
  });

  it("OBT Lab, Resource Circle e Admin sozinho não veem o botão, com o campo presente ou ausente", () => {
    const cases: [SessionRole, RegionKey[]][] = [
      ["obtLab", ["africa"]],
      ["resourceCircle", []],
      ["admin", []],
    ];
    for (const [role, writes] of cases) {
      expect(intakeButton(visit([role], FORM, writes)), `${role} presente`).toBe(false);
      expect(intakeButton(visit([role])), `${role} ausente`).toBe(false);
    }
  });

  it("a plataforma (writeRegionScope null) vê o botão mesmo sem o papel coordinator", () => {
    expect(intakeButton(visit(["admin"], FORM, null))).toBe(true);
    expect(intakeButton(visit(["obtLab"], FORM, null))).toBe(true);
  });

  it("o cabeçalho pergunta o papel, e o diálogo com a lista de links só monta para quem gera o link", () => {
    const header = readFileSync(join(process.cwd(), "src/components/layout/AppHeader.tsx"), "utf8")
      .replace(/\s+/gu, " ")
      .replace(/\( /gu, "(")
      .replace(/,? \)/gu, ")");
    expect(header).toContain("canMintLeaderLinks(user.roles, user.writeRegionScope)");
    const mounts = header.split("<LeaderLinkDialog");
    expect(mounts).toHaveLength(2);
    expect(mounts[0].slice(-40)).toMatch(/mintsLinks (\?|&&)/u);
  });
});

describe("o Novo projeto é de quem o servidor deixa escrever um (OBT-571)", () => {
  const newButton = (html: string) => html.includes(i18n.t("btn_new"));

  it("coordenação, admin e OBT Lab abrem uma ficha nova", () => {
    for (const roles of [["coordinator"], ["admin"], ["obtLab"]] as const) {
      expect(newButton(visit([...roles])), roles.join("+")).toBe(true);
    }
  });

  it("o Círculo que coordena é coordenação e abre; o que é só Círculo, ou Círculo e OBT Lab, não", () => {
    expect(newButton(visit(["resourceCircle", "coordinator"]))).toBe(true);
    expect(newButton(visit(["resourceCircle", "admin"]))).toBe(true);
    expect(newButton(visit(["resourceCircle"]))).toBe(false);
    expect(newButton(visit(["resourceCircle", "obtLab"]))).toBe(false);
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
