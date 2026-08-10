import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { createElement, type ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import * as ts from "typescript";
import { beforeAll, describe, expect, it, vi } from "vitest";
import en from "../locales/en.json";
import ptBR from "../locales/pt-BR.json";

const SCANNED_DIRS = ["src/components", "src/contexts"];

const INTERNAL_SHOWCASE_UNTRANSLATED_BY_DESIGN = [
  "src/components/pages/design-system/ControlsSection.tsx",
  "src/components/pages/design-system/DesignSystemPage.tsx",
  "src/components/pages/design-system/StatusSection.tsx",
  "src/components/pages/design-system/SurfacesSection.tsx",
];

const PHRASE_LENGTH = 20;

const english: Record<string, string> = en;

const divergingEntries = Object.entries(ptBR).filter(
  ([key, value]) => english[key] !== value,
);

function normalise(text: string): string {
  return text.replace(/\s+/gu, " ").trim();
}

function leakedKeys(chunks: string[]): string[] {
  const keys: string[] = [];
  for (const chunk of chunks) {
    for (const [key, translated] of divergingEntries) {
      const leaked =
        chunk === translated ||
        (translated.length >= PHRASE_LENGTH && chunk.includes(translated));
      if (leaked) keys.push(key);
    }
  }
  return keys;
}

function walk(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    return entry.isDirectory() ? walk(path) : [path];
  });
}

function scannedFiles(): string[] {
  const exempt = new Set(INTERNAL_SHOWCASE_UNTRANSLATED_BY_DESIGN);
  return SCANNED_DIRS.flatMap((dir) => walk(join(process.cwd(), dir)))
    .map((path) => relative(process.cwd(), path).split("\\").join("/"))
    .filter((path) => /\.tsx?$/.test(path) && !exempt.has(path));
}

function isModuleSpecifier(node: ts.StringLiteral): boolean {
  const parent = node.parent;
  return (
    (ts.isImportDeclaration(parent) && parent.moduleSpecifier === node) ||
    (ts.isExportDeclaration(parent) && parent.moduleSpecifier === node) ||
    ts.isImportTypeNode(parent) ||
    (ts.isCallExpression(parent) &&
      parent.expression.kind === ts.SyntaxKind.ImportKeyword)
  );
}

function literalsIn(path: string, text: string): string[] {
  const source = ts.createSourceFile(
    path,
    text,
    ts.ScriptTarget.Latest,
    true,
    path.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
  const found: string[] = [];
  const visit = (node: ts.Node) => {
    if (
      (ts.isStringLiteral(node) && !isModuleSpecifier(node)) ||
      ts.isNoSubstitutionTemplateLiteral(node) ||
      ts.isTemplateHead(node) ||
      ts.isTemplateMiddle(node) ||
      ts.isTemplateTail(node) ||
      ts.isJsxText(node)
    ) {
      found.push(normalise(node.text));
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return found.filter(Boolean);
}

function sourceLeaks(path: string): string[] {
  return leakedKeys(literalsIn(path, readFileSync(path, "utf8"))).map(
    (key) => `${path} renders ${key} as a literal`,
  );
}

const ENTITIES: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#x27;": "'",
  "&#39;": "'",
};

const USER_FACING_ATTRS = ["aria-label", "title", "placeholder", "alt"];

function decode(text: string): string {
  return text.replace(
    /&(?:amp|lt|gt|quot|#x27|#39);/gu,
    (entity) => ENTITIES[entity],
  );
}

function readableText(html: string): string[] {
  const attributes = new RegExp(
    `(?:${USER_FACING_ATTRS.join("|")})="([^"]*)"`,
    "gu",
  );
  const spoken = [
    ...html.split(/<[^>]*>/u),
    ...[...html.matchAll(attributes)].map((match) => match[1]),
  ];
  return spoken.map((chunk) => normalise(decode(chunk))).filter(Boolean);
}

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
storage.setItem(
  "shema-prefs-v1",
  JSON.stringify({ state: { metaphor: "atlas", lang: "en" }, version: 0 }),
);
vi.stubGlobal("localStorage", storage);
vi.stubGlobal("window", { localStorage: storage });

const { default: i18n } = await import("../index");
const { AuthProvider } = await import("../../contexts/AuthContext");
const { RoleSwitcher } = await import("../../components/layout/RoleSwitcher");
const { TopNav } = await import("../../components/layout/TopNav");
const { RitmoPage } = await import("../../components/pages/ritmo/RitmoPage");
const { OracaoPage } = await import("../../components/pages/oracao/OracaoPage");
const { EtenPage } = await import("../../components/pages/eten/EtenPage");
const { FormulariosPage } = await import(
  "../../components/pages/formularios/FormulariosPage"
);
const { EquipePage } = await import("../../components/pages/equipe/EquipePage");
const { IntercessoresPage } = await import(
  "../../components/pages/intercessores/IntercessoresPage"
);

const ROUTES: [string, () => ReactElement][] = [
  ["the area nav", TopNav],
  ["/ritmo", RitmoPage],
  ["/oracao", OracaoPage],
  ["/eten", EtenPage],
  ["/formularios", FormulariosPage],
  ["/equipe", EquipePage],
  ["/oracao/intercessores", IntercessoresPage],
];

const AREA_LEADS: [string, () => ReactElement, string][] = [
  ["/ritmo", RitmoPage, en.ritmo_lead],
  ["/oracao", OracaoPage, en.oracao_lead],
  ["/eten", EtenPage, en.eten_lead],
  ["/formularios", FormulariosPage, en.forms_lead],
  ["/equipe", EquipePage, en.equipe_lead],
  ["/oracao/intercessores", IntercessoresPage, en.int_lead],
];

function markup(page: () => ReactElement): string {
  return renderToStaticMarkup(
    createElement(MemoryRouter, null, createElement(page)),
  );
}

function render(page: () => ReactElement): string[] {
  return readableText(markup(page));
}

function renderSession(): string {
  return renderToStaticMarkup(
    createElement(AuthProvider, null, createElement(RoleSwitcher)),
  );
}

describe("Portuguese catalogue values written as literals", () => {
  it("scans every component and context that is not exempt", () => {
    const files = scannedFiles();
    expect(files.length).toBeGreaterThan(30);
    expect(files).toContain("src/components/layout/TopNav.tsx");
    expect(files).toContain("src/components/layout/AppShell.tsx");
    expect(files).toContain("src/contexts/AuthContext.tsx");
    expect(divergingEntries.length).toBeGreaterThan(500);
  });

  it("finds none in src/components and src/contexts", () => {
    expect(scannedFiles().flatMap(sourceLeaks)).toEqual([]);
  });

  it("flags a navigation label that goes back to a literal", () => {
    const relapse = `export function TopNav() {
      return <nav aria-label="${ptBR.nav_areas}"><a>${ptBR.nav_ritmo}</a></nav>;
    }`;
    const chunks = literalsIn("src/components/layout/TopNav.tsx", relapse);
    expect(leakedKeys(chunks).sort()).toEqual(["nav_areas", "nav_ritmo"]);
  });

  it("flags a lead and its closing line pasted into one sentence", () => {
    const relapse = `export function IntercessoresPage() {
      return <EmptyState message="${ptBR.int_lead} ${ptBR.empty_soon}" />;
    }`;
    const path = "src/components/pages/intercessores/IntercessoresPage.tsx";
    expect(leakedKeys(literalsIn(path, relapse)).sort()).toEqual([
      "empty_soon",
      "int_lead",
    ]);
  });

  it("flags a role label copied back into the session map", () => {
    const relapse = `const SESSION_ROLE_LABELS = { coordinator: "${ptBR.role_coordinator}" };`;
    const chunks = literalsIn("src/contexts/AuthContext.tsx", relapse);
    expect(leakedKeys(chunks)).toContain("role_coordinator");
  });

  it("leaves field data alone", () => {
    const fieldData = `const sample = ["Waima’a", "Ngäbere"];
      const note = "Chuva forte levou o telhado. Equipe abrigada na base YWAM.";`;
    const path = "src/components/pages/projetos/Card.tsx";
    expect(leakedKeys(literalsIn(path, fieldData))).toEqual([]);
  });

  it("keeps every exempt path pointing at a file that still exists", () => {
    for (const path of INTERNAL_SHOWCASE_UNTRANSLATED_BY_DESIGN) {
      expect(existsSync(join(process.cwd(), path)), path).toBe(true);
    }
  });
});

describe("the shell rendered with the language set to EN", () => {
  beforeAll(async () => {
    await i18n.changeLanguage("en");
  });

  it("starts in English from the persisted preference alone", () => {
    expect(i18n.language).toBe("en");
  });

  it("carries no Portuguese chrome on any area route", () => {
    const offenders = ROUTES.flatMap(([route, page]) =>
      leakedKeys(render(page)).map((key) => `${route} shows ${key} in Portuguese`),
    );
    expect(offenders).toEqual([]);
  });

  it("names the six areas and the nav landmark from the catalogue", () => {
    expect(render(TopNav)).toEqual([
      en.nav_projetos,
      en.nav_ritmo,
      en.nav_oracao,
      en.nav_eten,
      en.nav_formularios,
      en.nav_equipe,
      en.nav_areas,
    ]);
  });

  it("closes every area placeholder with its lead", () => {
    for (const [route, page, lead] of AREA_LEADS) {
      expect(render(page), route).toContain(`${lead} ${en.empty_soon}`);
    }
  });

  it("keeps the intercessors link on the prayer placeholder", () => {
    expect(render(OracaoPage)).toContain(en.nav_intercessores);
  });

  it("labels every session role chip from the catalogue", () => {
    const html = renderSession();
    for (const label of [
      en.equipe_global,
      en.role_coordinator,
      en.role_obtlab,
      en.role_resource,
    ]) {
      expect(html, label).toContain(label);
    }
  });

  it("says 'no holder yet' in English when the org chart has nobody", () => {
    storage.setItem("shema-session-v1", "coordinator");
    expect(renderSession()).toContain(en.sb_no_coordinator);
    storage.removeItem("shema-session-v1");
  });

  it("returns to Portuguese chrome when the language goes back", async () => {
    await i18n.changeLanguage("pt");
    expect(render(TopNav)).toContain(ptBR.nav_areas);
    expect(render(RitmoPage)).toContain(
      `${ptBR.ritmo_lead} ${ptBR.empty_soon}`,
    );
    await i18n.changeLanguage("en");
  });
});
