import { createElement, type ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Project } from "../../../../types/project";

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
const { makeProject } = await import("../../../../utils/__tests__/factory");
const { ProjectCardDiario } = await import("../Journal/ProjectCardDiario");
const { ProjectCardAtlas } = await import("../ProjectCardAtlas");
const { JournalView } = await import("../Journal");
const { AtlasView } = await import("../Atlas");
const { cardSummary } = await import("../card");
const { getLocationDisplay } = await import("../../../../utils/region");

interface Element {
  tag: string;
  attrs: Record<string, string>;
  children: Node[];
  parent: Element | null;
}
type Node = Element | string;

const VOID_TAGS = new Set([
  "area",
  "br",
  "col",
  "embed",
  "hr",
  "img",
  "input",
  "link",
  "meta",
  "source",
  "track",
  "wbr",
]);
const ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  "#x27": "'",
  "#39": "'",
};
const decode = (text: string) =>
  text.replace(
    /&(amp|lt|gt|quot|#x27|#39);/gu,
    (_, entity: string) => ENTITIES[entity],
  );

function parse(markup: string): Element {
  const root: Element = { tag: "#root", attrs: {}, children: [], parent: null };
  let current = root;
  const tokens =
    /<\/([a-z][a-z0-9-]*)\s*>|<([a-z][a-z0-9-]*)((?:\s+[^\s=>/]+(?:="[^"]*")?)*)\s*(\/?)>|([^<]+)/giu;
  for (const [, closing, opening, attrs, selfClosing, text] of markup.matchAll(
    tokens,
  )) {
    if (text !== undefined) {
      current.children.push(decode(text));
    } else if (closing !== undefined) {
      expect(current.tag, "marcação desbalanceada").toBe(closing);
      current = current.parent!;
    } else {
      const element: Element = {
        tag: opening,
        attrs: Object.fromEntries(
          [...attrs.matchAll(/([^\s=]+)(?:="([^"]*)")?/gu)].map(
            ([, name, value]) => [name, decode(value ?? "")],
          ),
        ),
        children: [],
        parent: current,
      };
      current.children.push(element);
      if (!selfClosing && !VOID_TAGS.has(opening)) current = element;
    }
  }
  expect(current, "marcação sem fechamento").toBe(root);
  return root;
}

const elements = (node: Element): Element[] =>
  node.children.flatMap((child) =>
    typeof child === "string" ? [] : [child, ...elements(child)],
  );

const isInside = (node: Element, ancestor: Element): boolean =>
  node.parent !== null &&
  (node.parent === ancestor || isInside(node.parent, ancestor));

const hiddenFromReader = (node: Element | null): boolean =>
  node !== null &&
  (node.attrs["aria-hidden"] === "true" ||
    "hidden" in node.attrs ||
    hiddenFromReader(node.parent));

const spokenText = (node: Element): string =>
  node.children
    .map((child) =>
      typeof child === "string"
        ? child
        : child.attrs["aria-hidden"] === "true"
          ? ""
          : spokenText(child),
    )
    .join("")
    .replace(/\s+/gu, " ")
    .trim();

interface CardReading {
  button: Element;
  name: string;
  description: string;
  describedBy: Element[];
}

function readCards(markup: string): CardReading[] {
  const root = parse(markup);
  const all = elements(root);
  return all
    .filter((node) => node.attrs.role === "button")
    .map((button) => {
      const ids = (button.attrs["aria-describedby"] ?? "")
        .split(/\s+/u)
        .filter(Boolean);
      const describedBy = ids.flatMap((id) =>
        all.filter((node) => node.attrs.id === id),
      );
      return {
        button,
        name: (button.attrs["aria-label"] ?? "").trim() || spokenText(button),
        description: describedBy.map(spokenText).join(" "),
        describedBy,
      };
    });
}

const noop = () => {};

const diario = (project: Project) =>
  renderToStaticMarkup(
    createElement(ProjectCardDiario, { project, index: 0, onOpen: noop }),
  );
const atlas = (project: Project) =>
  renderToStaticMarkup(
    createElement(ProjectCardAtlas, { project, onOpen: noop }),
  );

const onlyCard = (markup: string): CardReading => {
  const cards = readCards(markup);
  expect(cards).toHaveLength(1);
  return cards[0];
};

const fixture = async (id: string) => {
  const project = (await projectsAPI.list()).find((item) => item.id === id);
  if (!project) throw new Error(id);
  return project;
};

const assessed = () =>
  makeProject({
    id: "avaliado",
    languageName: "Língua Avaliada",
    status: "em-andamento",
    healthEmotional: "boa",
    healthRelational: "atencao",
    healthSpiritual: "critica",
    translatedUnits: 110,
    communityCheckedUnits: 7,
    approvedUnits: 42,
    totalUnits: 1189,
  });

beforeEach(async () => {
  await i18n.changeLanguage("pt");
});

describe("o cartão lido pela árvore de acessibilidade", () => {
  it("o Diário e o Atlas têm o mesmo nome curto e o mesmo resumo", async () => {
    for (const project of [await fixture("afrikaans-kaaps"), assessed()]) {
      const name = i18n.t("card_open", { language: project.languageName });
      const description = cardSummary(project, i18n.t);

      for (const card of [
        onlyCard(diario(project)),
        onlyCard(atlas(project)),
      ]) {
        expect(card.name).toBe(name);
        expect(card.description).toBe(description);
      }
    }
  });

  it("o resumo mora fora do botão, num nó só, que o leitor alcança", async () => {
    for (const markup of [diario(assessed()), atlas(assessed())]) {
      const card = onlyCard(markup);

      expect(card.describedBy).toHaveLength(1);
      const [summary] = card.describedBy;
      expect(isInside(summary, card.button)).toBe(false);
      expect(isInside(card.button, summary)).toBe(false);
      expect(hiddenFromReader(summary)).toBe(false);
      expect(spokenText(summary)).toBe(card.description);
    }
  });

  it("todo texto só-para-leitor preso dentro do botão reaparece no resumo", () => {
    for (const markup of [diario(assessed()), atlas(assessed())]) {
      const card = onlyCard(markup);
      const trapped = elements(card.button)
        .filter((node) => node.attrs.class?.split(/\s+/u).includes("sr-only"))
        .map(spokenText);

      expect(trapped.length).toBeGreaterThan(0);
      for (const phrase of trapped) expect(card.description).toContain(phrase);
    }
  });

  it("diz prioridade, as três dimensões de saúde, o progresso traduzido e a data", () => {
    const card = onlyCard(diario(assessed()));

    expect(card.description).toBe(
      "Precisa de atenção agora. Emocional: Boa. Relacional: Atenção. Espiritual: Crítica. 110 de 1189 livros traduzidos. Sem atualização registrada.",
    );
  });

  it("em inglês o resumo inteiro troca de língua", async () => {
    await i18n.changeLanguage("en");
    const card = onlyCard(atlas(assessed()));

    expect(card.name).toBe("Open the Língua Avaliada project");
    expect(card.description).toBe(
      "Needs attention now. Emotional: Good. Relational: Attention. Spiritual: Critical. 110 of 1189 livros translated. No update recorded.",
    );
  });

  it("nem o nome nem o resumo dizem o lugar de um projeto de país sensível", async () => {
    const project = await fixture("zapoteco-de-santiago-lachirigi");
    expect(project.sensitiveCountry).toBe(true);
    expect(getLocationDisplay(project).withheld).toBe(true);

    for (const card of [onlyCard(diario(project)), onlyCard(atlas(project))]) {
      const spoken = `${card.name} ${card.description}`;
      expect(spoken).not.toContain(project.location);
      expect(spoken).not.toContain(project.team);
    }
  });
});

describe("o resumo diz o que a Karina definiu, nesta ordem (OBT-550)", () => {
  const NOW = new Date("2026-09-30T12:00:00");
  const pending = (over: Partial<Project>) =>
    makeProject({
      id: "pendente",
      languageName: "Língua Pendente",
      status: "em-andamento",
      translatedUnits: 3,
      totalUnits: 25,
      totalUnitsType: "Capítulos",
      ...over,
    });
  const updatedOn = (date: string): Partial<Project> => ({
    progressHistory: [
      {
        date,
        translatedUnits: 3,
        communityCheckedUnits: 0,
        approvedUnits: 0,
      },
    ],
  });

  it("prioridade, as três saúdes, o progresso e a data, nesta ordem", () => {
    const sentences = cardSummary(
      pending(updatedOn("2026-09-10")),
      i18n.t,
      NOW,
    ).split(/(?<=\.) /u);

    expect(sentences).toHaveLength(6);
    expect(sentences[1]).toMatch(/^Emocional/u);
    expect(sentences[2]).toMatch(/^Relacional/u);
    expect(sentences[3]).toMatch(/^Espiritual/u);
    expect(sentences[4]).toBe("3 de 25 capítulos traduzidos.");
    expect(sentences[5]).toMatch(/^Atualizado em .*10/u);
  });

  it("a unidade é a do projeto, com o padrão e a minúscula da aba Progresso", () => {
    expect(
      cardSummary(pending({ totalUnitsType: "Histórias" }), i18n.t, NOW),
    ).toContain("3 de 25 histórias traduzidos.");
    expect(cardSummary(pending({ totalUnitsType: "" }), i18n.t, NOW)).toContain(
      "3 de 25 livros traduzidos.",
    );
  });

  it("sem data de atualização, o resumo diz que não há", () => {
    const summary = cardSummary(pending({}), i18n.t, NOW);

    expect(summary).toContain("Sem atualização registrada.");
    expect(summary).not.toContain("Atualizado em");
  });

  it("prazo, selo de atualização antiga e as contagens de checado e aprovado ficam de fora", () => {
    const summary = cardSummary(
      pending({
        deadline: "2026-09-20",
        communityCheckedUnits: 2,
        approvedUnits: 1,
        ...updatedOn("2026-04-01"),
      }),
      i18n.t,
      NOW,
    );

    expect(summary).not.toMatch(/Prazo|em atraso|Crítico 120|Sem notícias/u);
    expect(summary).not.toMatch(/checado|aprovado/iu);
  });

  it("em inglês, a mesma frase sai em inglês", async () => {
    await i18n.changeLanguage("en");

    expect(
      cardSummary(
        pending({ ...updatedOn("2026-09-10"), totalUnitsType: "Chapters" }),
        i18n.t,
        NOW,
      ),
    ).toMatch(/3 of 25 chapters translated\. Updated .*10/u);
  });

  it("os dois cartões dizem o mesmo resumo", () => {
    const project = pending(updatedOn("2026-09-10"));

    for (const card of [onlyCard(diario(project)), onlyCard(atlas(project))]) {
      expect(card.description).toBe(cardSummary(project, i18n.t));
    }
  });
});

describe("cada cartão da lista aponta para o próprio resumo", () => {
  const views: Record<string, (page: Project[]) => ReactElement> = {
    Diário: (page) =>
      createElement(JournalView, { projects: page, onOpen: noop }),
    Atlas: (page) =>
      createElement(AtlasView, {
        projects: page,
        locationsWithheld: null,
        onSelect: noop,
      }),
  };

  for (const [view, render] of Object.entries(views)) {
    it(`${view}: um id por cartão, e o resumo de cada um é o do seu projeto`, async () => {
      const page = (await projectsAPI.list()).slice(0, 8);
      const cards = readCards(renderToStaticMarkup(render(page)));

      expect(cards).toHaveLength(page.length);
      const ids = cards.map((card) => card.button.attrs["aria-describedby"]);
      expect(new Set(ids).size).toBe(page.length);

      cards.forEach((card, index) => {
        expect(card.describedBy).toHaveLength(1);
        expect(isInside(card.describedBy[0], card.button)).toBe(false);
        expect(card.name).toBe(
          i18n.t("card_open", { language: page[index].languageName }),
        );
        expect(card.description).toBe(cardSummary(page[index], i18n.t));
      });
    });
  }
});
