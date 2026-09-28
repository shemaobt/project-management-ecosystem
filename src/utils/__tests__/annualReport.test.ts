import { describe, expect, it } from "vitest";
import { createEmptyProject } from "../../fixtures/blank";
import type { Project } from "../../types/project";
import {
  annualReportYears,
  buildAnnualReport,
  defaultAnnualYear,
  offeredYear,
} from "../annualReport";

const project = (id: string, over: Partial<Project> = {}): Project => ({
  ...createEmptyProject(id),
  languageName: id,
  location: "Brazil",
  ...over,
});

/**
 * GATE-02 (OBT-388, Karina, 22/set/2026) fez da Celebração um relatório: quantos projetos
 * iniciaram e quantos finalizaram no ano. FE-50 (OBT-533).
 */
describe("iniciados e finalizados saem das datas, por ano e por região", () => {
  const projects = [
    project("a", { startDate: "2025-03-10" }),
    project("b", { startDate: "2025-11-01", location: "Uganda" }),
    project("c", { startDate: "2024-12-31" }),
    project("d", { status: "concluido", completedDate: "2025-06-30" }),
    project("e", { status: "concluido", completedDate: "2026-01-01" }),
  ];

  it("conta o ano pedido e só ele", () => {
    const report = buildAnnualReport(projects, 2025);

    expect(report.started).toBe(2);
    expect(report.finished).toBe(1);
  });

  it("separa por região, na ordem do organograma", () => {
    const report = buildAnnualReport(projects, 2025);

    expect(report.regions.map((entry) => entry.region)).toEqual(["south-america", "africa"]);
    expect(report.regions[0].started.map((entry) => entry.id)).toEqual(["a"]);
    expect(report.regions[0].finished.map((entry) => entry.id)).toEqual(["d"]);
    expect(report.regions[1].started.map((entry) => entry.id)).toEqual(["b"]);
  });

  it("uma data ilegível não põe o projeto em ano nenhum", () => {
    const report = buildAnnualReport([project("x", { startDate: "13/04/2025" })], 2025);

    expect(report.started).toBe(0);
    expect(report.hasData).toBe(false);
  });
});

describe("concluído sem data não some, nem entra num ano qualquer", () => {
  it("fica fora dos finalizados e é contado à parte", () => {
    const report = buildAnnualReport(
      [project("sem-data", { status: "concluido" }), project("a", { startDate: "2025-01-02" })],
      2025,
    );

    expect(report.finished).toBe(0);
    expect(report.finishedUndated).toBe(1);
  });
});

describe("ano sem dado não é ano de zero", () => {
  it("sem nenhuma data, o relatório diz que não tem dado", () => {
    expect(buildAnnualReport([project("a"), project("b")], 2025).hasData).toBe(false);
  });

  it("com datas em outros anos, zero no ano pedido é uma afirmação", () => {
    const report = buildAnnualReport([project("a", { startDate: "2023-05-05" })], 2025);

    expect(report.hasData).toBe(true);
    expect(report.started).toBe(0);
  });
});

describe("país sensível passa pelo dono da redação", () => {
  it("o projeto aparece com a região, sem país e sem base", () => {
    const sensitive = project("sigilosa", {
      startDate: "2025-04-01",
      location: "Egypt, Cairo",
      team: "YWAM Egypt",
      sensitiveCountry: true,
    });
    const [line] = buildAnnualReport([sensitive], 2025).regions[0].started;

    expect(line.location).toEqual({ withheld: true, regionLabelKey: "continent_africa" });
    expect(JSON.stringify(line)).not.toContain("Egypt");
    expect(JSON.stringify(line)).not.toContain("Cairo");
  });
});

describe("o seletor olha para trás", () => {
  const SEPTEMBER = new Date(2026, 8, 28);

  it("abre no último ano civil fechado", () => {
    expect(defaultAnnualYear(SEPTEMBER)).toBe(2025);
  });

  it("oferece quatro anos, do corrente para trás", () => {
    expect(annualReportYears(SEPTEMBER)).toEqual([2026, 2025, 2024, 2023]);
  });

  /** Um link antigo não pode abrir um ano que o seletor não oferece (revisão da PR #64). */
  it("um ano que o seletor não oferece não abre a página", () => {
    expect(offeredYear("2025", SEPTEMBER)).toBe(2025);
    expect(offeredYear("1999", SEPTEMBER)).toBeNull();
    expect(offeredYear("2027", SEPTEMBER)).toBeNull();
    expect(offeredYear("25", SEPTEMBER)).toBeNull();
    expect(offeredYear(undefined, SEPTEMBER)).toBeNull();
  });
});
