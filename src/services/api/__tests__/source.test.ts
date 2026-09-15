import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";
import { READS_THROUGH_THE_API_LAYER } from "../../../../eslint.config.js";
import * as fixture from "../../../fixtures";
import * as resolved from "../index";
import * as api from "../endpoints";
import { projectBrowseAPI as apiProjectBrowseAPI } from "../projectBrowse";
import {
  INTEGRATED,
  INTEGRATED_BY,
  OVERRIDE_VARIABLE,
  SOURCES,
  parseOverride,
  resolveSource,
  sourceFor,
  type DataNamespace,
} from "../source";

const NAMESPACES = Object.keys(INTEGRATED) as DataNamespace[];

const PAIRS = [
  ["projects", api.projectsAPI, fixture.projectsAPI, resolved.projectsAPI],
  [
    "projectsBrowse",
    apiProjectBrowseAPI,
    fixture.projectBrowseAPI,
    resolved.projectBrowseAPI,
  ],
  ["regions", api.regionsAPI, fixture.regionsAPI, resolved.regionsAPI],
  ["meetings", api.meetingsAPI, fixture.meetingsAPI, resolved.meetingsAPI],
  ["prayer", api.prayerAPI, fixture.prayerAPI, resolved.prayerAPI],
  [
    "intercessors",
    api.intercessorsAPI,
    fixture.intercessorsAPI,
    resolved.intercessorsAPI,
  ],
  ["eten", api.etenAPI, fixture.etenAPI, resolved.etenAPI],
  ["forms", api.formsAPI, fixture.formsAPI, resolved.formsAPI],
] as const;

type Namespace = Record<string, (...args: never[]) => unknown>;

const shape = (namespace: object): string[] =>
  Object.entries(namespace)
    .map(([name, value]) => `${name}/${(value as () => void).length}`)
    .sort();

describe("a tabela de troca", () => {
  it("tem uma linha, e um dono, para cada namespace", () => {
    expect(NAMESPACES.length).toBeGreaterThan(0);
    expect(Object.keys(INTEGRATED_BY).sort()).toEqual([...NAMESPACES].sort());
    for (const namespace of NAMESPACES) {
      expect(SOURCES, namespace).toContain(INTEGRATED[namespace]);
      expect(INTEGRATED_BY[namespace], namespace).toMatch(/^(INT|BE)-\d\d/u);
    }
  });

  it("a INT-01 liga a sessão e mais nada: o resto espera o endpoint dela", () => {
    expect(INTEGRATED.session).toBe("api");
    expect(INTEGRATED_BY.session).toBe("INT-01 · BE-03");
    const waiting = NAMESPACES.filter(
      (namespace) => INTEGRATED[namespace] === "fixtures",
    );
    expect(waiting).toEqual([
      "projects",
      "regions",
      "meetings",
      "prayer",
      "intercessors",
      "eten",
      "forms",
    ]);
  });

  it("os contornos do globo não são namespace de API nenhum", () => {
    expect(NAMESPACES).not.toContain("geo");
    expect(resolved.geoAPI).toBe(fixture.geoAPI);
    expect(api).not.toHaveProperty("geoAPI");
  });

  it("o flag global força os dois lados", () => {
    for (const namespace of NAMESPACES) {
      expect(sourceFor(namespace, "api"), namespace).toBe("api");
      expect(sourceFor(namespace, "fixtures"), namespace).toBe("fixtures");
      expect(sourceFor(namespace, null), namespace).toBe(INTEGRATED[namespace]);
    }
  });

  it("um valor escrito errado não vira nada em silêncio", () => {
    for (const typo of ["API", "fixture", "true", "", undefined, 1]) {
      expect(parseOverride(typo), String(typo)).toBeNull();
    }
    expect(parseOverride("api")).toBe("api");
    expect(parseOverride("fixtures")).toBe("fixtures");
    expect(OVERRIDE_VARIABLE).toBe("VITE_DATA_SOURCE");
  });
});

describe("as fixtures como test doubles", () => {
  it("a suíte roda inteira sobre elas", () => {
    expect(import.meta.env.VITE_DATA_SOURCE).toBe("fixtures");
    for (const namespace of [...NAMESPACES, "session" as const]) {
      expect(resolveSource(namespace), namespace).toBe("fixtures");
    }
  });

  it("e é a fixture, o mesmo objeto, que cada namespace resolvido serve", () => {
    for (const [name, , double, served] of PAIRS) {
      expect(served, name).toBe(double);
    }
  });
});

describe("atrás da mesma interface", () => {
  it("cada namespace real tem exatamente os métodos da fixture, com a mesma aridade", () => {
    for (const [name, real, double] of PAIRS) {
      expect(shape(real), name).toEqual(shape(double));
    }
  });

  it("todo método dos dois lados é assíncrono", async () => {
    for (const [name, real, double] of PAIRS) {
      for (const side of [real, double] as Namespace[]) {
        for (const [method, fn] of Object.entries(side)) {
          expect(fn.constructor.name, `${name}.${method}`).toBe(
            "AsyncFunction",
          );
        }
      }
    }
  });

  it("os oito namespaces do contrato congelado estão todos servidos", () => {
    for (const namespace of [
      "projectsAPI",
      "regionsAPI",
      "meetingsAPI",
      "prayerAPI",
      "intercessorsAPI",
      "etenAPI",
      "formsAPI",
      "geoAPI",
    ]) {
      expect(resolved, namespace).toHaveProperty(namespace);
      expect(fixture, namespace).toHaveProperty(namespace);
    }
  });
});

describe("quem tem permissão de importar o dublê", () => {
  const TEST_FILE = /(?:^|\/)__tests__\//u;

  function walk(dir: string): string[] {
    return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
      const path = join(dir, entry.name);
      return entry.isDirectory() ? walk(path) : [path];
    });
  }

  const shipped = ["components", "contexts", "hooks", "stores"]
    .flatMap((dir) => walk(join(process.cwd(), "src", dir)))
    .map((path) => relative(process.cwd(), path).split("\\").join("/"))
    .filter((path) => /\.tsx?$/u.test(path) && !TEST_FILE.test(path));

  it("a varredura enxerga as quatro pastas que a regra de lint nomeia", () => {
    expect(READS_THROUGH_THE_API_LAYER).toEqual([
      "src/components/**/*.{ts,tsx}",
      "src/contexts/**/*.{ts,tsx}",
      "src/hooks/**/*.{ts,tsx}",
      "src/stores/**/*.{ts,tsx}",
    ]);
    expect(shipped.length).toBeGreaterThan(80);
    expect(shipped).toContain("src/stores/projectsStore.ts");
    expect(shipped).toContain("src/components/pages/eten/index.tsx");
  });

  it("nenhuma tela nem store importa src/fixtures — todas passam pela camada de API", () => {
    const offenders = shipped.filter((path) =>
      /from "[^"]*\/fixtures(?:\/|")/u.test(readFileSync(path, "utf8")),
    );
    expect(offenders).toEqual([]);
  });
});
