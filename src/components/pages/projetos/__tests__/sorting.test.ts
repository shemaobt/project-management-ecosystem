import { describe, expect, it } from "vitest";
import { projectsAPI } from "../../../../fixtures";
import { EMPTY_FILTERS } from "../../../../stores/filtersStore";
import { makeProject } from "../../../../utils/__tests__/factory";
import { filterProjects } from "../../../../utils/search";
import { SORT_KEYS } from "../../../../constants/sorting";
import { sortProjects } from "../sorting";

const PT = "pt-BR";
const NOW = new Date("2026-05-14T12:00:00");

const names = (projects: { languageName: string }[]) =>
  projects.map((project) => project.languageName);

const ids = (projects: { id: string }[]) => projects.map((project) => project.id);

describe("ordenação por língua", () => {
  it("põe o nome com diacrítico no lugar do alfabeto, não depois do z", async () => {
    const all = await projectsAPI.list();
    const order = names(sortProjects(all, "name", PT));
    const at = (name: string) => order.indexOf(name);

    expect(at("Newar")).toBeGreaterThan(-1);
    expect(at("Newar")).toBeLessThan(at("Ngäbere"));
    expect(at("Ngäbere")).toBeLessThan(at("Nyikina"));
  });

  it("põe o nome em minúscula junto com a letra dele, não no fim da lista", async () => {
    const all = await projectsAPI.list();
    const order = names(sortProjects(all, "name", PT));
    const at = (name: string) => order.indexOf(name);

    expect(at("Pattani")).toBeLessThan(at("popoluca"));
    expect(at("popoluca")).toBeLessThan(at("purépecha de capacuaro"));
    expect(at("purépecha de capacuaro")).toBeLessThan(at("Purig Kargil"));
  });

  it("não reproduz a ordem ingênua de code units", async () => {
    const all = await projectsAPI.list();
    const naive = names(
      [...all].sort((a, b) =>
        a.languageName < b.languageName
          ? -1
          : a.languageName > b.languageName
            ? 1
            : 0,
      ),
    );

    expect(names(sortProjects(all, "name", PT))).not.toEqual(naive);
  });

  it("ordena nome fora do alfabeto latino pela collation, não pelo code unit", () => {
    const projects = [
      makeProject({ id: "yarilo", languageName: "Ярило" }),
      makeProject({ id: "yolka", languageName: "Ёлка" }),
      makeProject({ id: "elka", languageName: "Елка" }),
    ];

    expect(ids(sortProjects(projects, "name", PT))).toEqual([
      "elka",
      "yolka",
      "yarilo",
    ]);
    expect(ids([...projects].sort((a, b) => (a.languageName < b.languageName ? -1 : 1)))).toEqual([
      "yolka",
      "elka",
      "yarilo",
    ]);
  });
});

describe("ordenação por prazo", () => {
  it("ordena pela data ISO que a camada de fixtures normaliza, do mais próximo ao mais distante", () => {
    const projects = [
      makeProject({ id: "mar", deadline: "2026-03-01" }),
      makeProject({ id: "jan", deadline: "2026-01-15" }),
      makeProject({ id: "dez", deadline: "2025-12-31" }),
    ];

    expect(ids(sortProjects(projects, "deadline", PT))).toEqual([
      "dez",
      "jan",
      "mar",
    ]);
  });

  it("manda projeto sem prazo para o fim e preserva a ordem de entrada no empate", () => {
    const projects = [
      makeProject({ id: "sem-prazo-1", deadline: "" }),
      makeProject({ id: "mar", deadline: "2026-03-01" }),
      makeProject({ id: "jan", deadline: "2026-01-15" }),
      makeProject({ id: "sem-prazo-2", deadline: "" }),
      makeProject({ id: "mar-empate", deadline: "2026-03-01" }),
    ];

    expect(ids(sortProjects(projects, "deadline", PT))).toEqual([
      "jan",
      "mar",
      "mar-empate",
      "sem-prazo-1",
      "sem-prazo-2",
    ]);
  });

  it("mantém a ordem de entrada quando nenhum projeto tem prazo", () => {
    const projects = ["a", "b", "c"].map((id) =>
      makeProject({ id, deadline: "" }),
    );

    expect(ids(sortProjects(projects, "deadline", PT))).toEqual([
      "a",
      "b",
      "c",
    ]);
  });
});

describe("ordenação por progresso, equipe e saúde", () => {
  it("progresso vai do maior para o menor e projeto sem unidades fica por último", () => {
    const projects = [
      makeProject({ id: "dez", totalUnits: 100, translatedUnits: 10 }),
      makeProject({ id: "sem-unidades", totalUnits: 0, translatedUnits: 0 }),
      makeProject({ id: "noventa", totalUnits: 100, translatedUnits: 90 }),
    ];

    expect(ids(sortProjects(projects, "progress", PT))).toEqual([
      "noventa",
      "dez",
      "sem-unidades",
    ]);
  });

  it("saúde vai da melhor para a pior e a ficha sem avaliação fica por último", () => {
    const projects = [
      makeProject({
        id: "critica",
        healthEmotional: "critica",
        healthRelational: "critica",
        healthSpiritual: "critica",
        healthPhysical: "critica",
      }),
      makeProject({ id: "sem-avaliacao" }),
      makeProject({
        id: "boa",
        healthEmotional: "boa",
        healthRelational: "boa",
        healthSpiritual: "boa",
        healthPhysical: "boa",
      }),
    ];

    expect(ids(sortProjects(projects, "health", PT))).toEqual([
      "boa",
      "critica",
      "sem-avaliacao",
    ]);
  });

  it("equipe usa collation e manda equipe em branco para o fim", () => {
    const projects = [
      makeProject({ id: "sem-equipe", team: "" }),
      makeProject({ id: "zulu", team: "YWAM Zulu" }),
      makeProject({ id: "acores", team: "YWAM Açores" }),
      makeProject({ id: "amazonia", team: "YWAM Amazônia" }),
    ];

    expect(ids(sortProjects(projects, "team", PT))).toEqual([
      "acores",
      "amazonia",
      "zulu",
      "sem-equipe",
    ]);
  });
});

describe("a ordenação é uma permutação do conjunto filtrado", () => {
  it("nenhuma das cinco ordens perde, duplica ou inventa projeto", async () => {
    const all = await projectsAPI.list();
    const filtered = filterProjects(
      all,
      { ...EMPTY_FILTERS, continent: "asia" },
      "",
      NOW,
    );
    expect(filtered.projects.length).toBeGreaterThan(0);

    for (const key of SORT_KEYS) {
      const sorted = sortProjects(filtered.projects, key, PT);
      expect(sorted).toHaveLength(filtered.projects.length);
      expect([...ids(sorted)].sort()).toEqual([...ids(filtered.projects)].sort());
    }
  });

  it("não altera o array recebido", async () => {
    const all = await projectsAPI.list();
    const before = ids(all);
    sortProjects(all, "name", PT);
    expect(ids(all)).toEqual(before);
  });
});
