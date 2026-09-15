import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { loadRawProjects } from "../../fixtures/projects";

const TYPES_DIR = join(process.cwd(), "src", "types");

const FIELD = /^ {2}([A-Za-z][A-Za-z0-9]*)(\??):/;

interface Field {
  name: string;
  optional: boolean;
}

function interfaceFields(source: string, name: string): Field[] {
  const opening = `export interface ${name} {`;
  const start = source.indexOf(opening);
  if (start < 0) throw new Error(`interface not found: ${name}`);

  const body = source.slice(start + opening.length);
  const end = body.indexOf("\n}");
  if (end < 0) throw new Error(`unterminated interface: ${name}`);

  return body
    .slice(0, end)
    .split("\n")
    .flatMap((line) => {
      const match = FIELD.exec(line);
      return match ? [{ name: match[1], optional: match[2] === "?" }] : [];
    });
}

const projectFields = interfaceFields(
  readFileSync(join(TYPES_DIR, "project.ts"), "utf8"),
  "Project",
);

const exportKeys = new Set(Object.keys(loadRawProjects()[0]));

const names = (fields: readonly Field[]): string[] =>
  fields.map((field) => field.name).sort();

describe("a leitura da interface distingue obrigatório de opcional", () => {
  const sample = [
    "export interface Sample {",
    "  kept: string;",
    "  absent?: number;",
    "  nested: { inner: string };",
    "}",
    "",
    "export interface Other {",
    "  ignored: string;",
    "}",
  ].join("\n");

  it("lê só a interface pedida, e o ? separa as duas metades", () => {
    expect(interfaceFields(sample, "Sample")).toEqual([
      { name: "kept", optional: false },
      { name: "absent", optional: true },
      { name: "nested", optional: false },
    ]);
  });

  it("reclama de uma interface que não existe", () => {
    expect(() => interfaceFields(sample, "Missing")).toThrow();
  });
});

describe("a opcionalidade de Project é o retrato do export, não um ideal", () => {
  const required = projectFields.filter((field) => !field.optional);
  const optional = projectFields.filter((field) => field.optional);

  it("todo campo obrigatório é uma chave que o export dos 127 carrega", () => {
    expect(names(required).filter((name) => !exportKeys.has(name))).toEqual([]);
  });

  it("toda chave do export é um campo obrigatório", () => {
    const requiredNames = new Set(names(required));
    expect(
      [...exportKeys].filter((key) => !requiredNames.has(key)).sort(),
    ).toEqual([]);
  });

  it("nenhum campo opcional aparece no export", () => {
    expect(names(optional).filter((name) => exportKeys.has(name))).toEqual([]);
  });

  it("as duas metades são não-vazias", () => {
    expect(required.length).toBeGreaterThan(0);
    expect(optional.length).toBeGreaterThan(0);
  });
});

describe("o índice de tipos é a superfície congelada inteira", () => {
  const modules = readdirSync(TYPES_DIR, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".ts"))
    .map((entry) => entry.name.replace(/\.ts$/, ""))
    .filter((name) => name !== "index");

  const barrel = readFileSync(join(TYPES_DIR, "index.ts"), "utf8");

  it("reexporta todo módulo de tipo", () => {
    expect(
      modules.filter((name) => !barrel.includes(`from "./${name}"`)),
    ).toEqual([]);
  });

  it("a varredura enxerga os módulos que existem", () => {
    expect(modules).toContain("project");
    expect(modules).toContain("assessment");
  });
});
