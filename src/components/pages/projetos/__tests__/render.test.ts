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

const { default: i18n } = await import("../../../../i18n");
const { projectsAPI } = await import("../../../../fixtures");
const { ProjectCardDiario } = await import("../Journal/ProjectCardDiario");
const { ProjectCardCoral } = await import("../Coral/ProjectCardCoral");
const { makeProject } = await import("../../../../utils/__tests__/factory");
const { JournalView } = await import("../Journal");
const { CoralView } = await import("../Coral");
const { AtlasView } = await import("../Atlas");
const { DEFAULT_SORT } = await import("../../../../constants/sorting");
const { sortProjects } = await import("../sorting");

const noop = () => {};

const fixture = async (id: string) => {
  const project = (await projectsAPI.list()).find((item) => item.id === id);
  if (!project) throw new Error(id);
  return project;
};

const diario = (project: Parameters<typeof ProjectCardDiario>[0]["project"]) =>
  renderToStaticMarkup(
    createElement(ProjectCardDiario, { project, index: 0, onOpen: noop }),
  );

const coral = (project: Parameters<typeof ProjectCardCoral>[0]["project"]) =>
  renderToStaticMarkup(
    createElement(ProjectCardCoral, { project, onOpen: noop }),
  );

beforeEach(async () => {
  await i18n.changeLanguage("pt");
});

describe("o cartão do Diário renderizado", () => {
  it("mostra a ficha esparsa composta: travessão onde falta dado, nunca buraco", async () => {
    const project = await fixture("afrikaans-kaaps");
    const markup = diario(project);

    expect(markup).toContain("Afrikaans: Kaaps");
    expect(markup).toContain(">afr<");
    expect(markup).toContain("YWAM Sydney");
    expect(markup).toContain("South Africa");
    expect(markup).toContain("Bíblia Completa");
    expect(markup.match(/—/g)?.length).toBeGreaterThanOrEqual(3);
    expect(markup).not.toContain("undefined");
    expect(markup).not.toContain("NaN");
    expect(markup).not.toContain("Invalid Date");
  });

  it("mostra as três contagens do funil, não só a porcentagem", async () => {
    const project = await fixture("sa-di-of-high-egypt");
    const markup = diario(project);

    expect(markup).toContain("110/1189");
    expect(markup).toContain("0 checado");
    expect(markup).toContain("110 aprovado");
    expect(markup).toContain("9%");
  });

  it("é alcançável e abrível pelo teclado, com nome acessível", async () => {
    const project = await fixture("afrikaans-kaaps");
    const markup = diario(project);

    expect(markup).toContain('role="button"');
    expect(markup).toContain('tabindex="0"');
    expect(markup).toContain('aria-label="Abrir o projeto Afrikaans: Kaaps"');
  });

  it("diz o estado de cada dimensão de saúde em texto, não só na cor do ponto", async () => {
    const semAvaliacao = diario(await fixture("afrikaans-kaaps"));
    const avaliado = diario(
      makeProject({
        languageName: "Teste",
        healthEmotional: "boa",
        healthRelational: "atencao",
        healthSpiritual: "critica",
      }),
    );

    expect(semAvaliacao).toContain("Emocional: N/A");
    expect(avaliado).toContain("Emocional: Boa");
    expect(avaliado).toContain("Relacional: Atenção");
    expect(avaliado).toContain("Espiritual: Crítica");
  });
});

describe("o cartão Coral renderizado", () => {
  it("nomeia as três fases do funil com o vocabulário do produto", async () => {
    const markup = coral(await fixture("sa-di-of-high-egypt"));

    expect(markup).toContain("Traduzido");
    expect(markup).toContain("Checado");
    expect(markup).toContain("Aprovado");
    expect(markup).not.toContain(">Já<");
    expect(markup).not.toContain(">Mentor<");
  });

  it("em inglês, o rótulo de aprovado é a fase, não o papel", async () => {
    await i18n.changeLanguage("en");
    const markup = coral(await fixture("sa-di-of-high-egypt"));

    expect(markup).toContain("Approved");
    expect(markup).not.toContain(">Mentor<");
  });
});

describe("país sensível no cartão", () => {
  it("põe a região no lugar da localização, nos dois cartões", async () => {
    const project = await fixture("zapoteco-de-santiago-lachirigi");
    expect(project.location).toBe("Mexico");

    for (const markup of [diario(project), coral(project)]) {
      expect(markup).toContain("América do Norte");
      expect(markup).not.toContain("Mexico");
    }
  });

  it("a ficha comum continua mostrando a localização", async () => {
    const project = await fixture("nauete");
    expect(project.sensitiveCountry).toBe(false);

    expect(diario(project)).toContain(project.location);
    expect(coral(project)).toContain(project.location);
  });
});

describe("as três metáforas mostram a mesma janela do conjunto", () => {
  const PAGE_SIZE = 30;
  const shows = (markup: string, name: string) => markup.includes(`>${name}<`);

  it("a página exibida é a mesma nas três, e nenhuma passa dela", async () => {
    const all = await projectsAPI.list();
    const sorted = sortProjects(all, DEFAULT_SORT, "pt");
    expect(sorted.length).toBeGreaterThan(PAGE_SIZE);

    const page = sorted.slice(0, PAGE_SIZE);
    const dentro = page[PAGE_SIZE - 1].languageName;
    const fora = sorted[PAGE_SIZE].languageName;
    expect(dentro).not.toBe(fora);

    const markups = [
      renderToStaticMarkup(
        createElement(JournalView, { projects: page, onOpen: noop }),
      ),
      renderToStaticMarkup(
        createElement(CoralView, { projects: page, onOpen: noop }),
      ),
      renderToStaticMarkup(
        createElement(AtlasView, { projects: sorted, onSelect: noop }),
      ),
    ];

    for (const markup of markups) {
      expect(shows(markup, page[0].languageName)).toBe(true);
      expect(shows(markup, dentro)).toBe(true);
      expect(shows(markup, fora)).toBe(false);
    }
  });

  it("o Atlas recebe o conjunto inteiro e pagina sozinho, sem encolher o globo", async () => {
    const all = await projectsAPI.list();
    const sorted = sortProjects(all, DEFAULT_SORT, "pt");
    const markup = renderToStaticMarkup(
      createElement(AtlasView, { projects: sorted, onSelect: noop }),
    );
    expect(markup).toContain(`${PAGE_SIZE}/${sorted.length}`);
  });
});
