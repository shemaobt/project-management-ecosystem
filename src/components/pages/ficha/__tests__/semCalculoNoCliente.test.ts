import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { HealthAssessment } from "../../../../types/project";

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
const { HEALTH_LABEL_KEYS } = await import("../../../../constants/status");
const { createRecord, readRecord } = await import("../../../../fixtures/projectRecord");
const { projectsAPI } = await import("../../../../fixtures");
const { makeProject } = await import("../../../../utils/__tests__/factory");
const { AssessmentHistory } = await import("../tabs/saude/AssessmentHistory");
const { ProjectCardDiario } = await import("../../projetos/Journal/ProjectCardDiario");

const entry = (over: Partial<HealthAssessment>): HealthAssessment => ({
  date: "2026-10-01",
  assessor: "Sofia",
  emotional: "critica",
  relational: "boa",
  spiritual: "boa",
  physical: "boa",
  notes: "",
  ...over,
});

beforeEach(async () => {
  await i18n.changeLanguage("pt");
});

describe("o histórico de saúde desenha o overall do servidor, e não o calcula (OBT-694, item 5)", () => {
  const render = (entries: HealthAssessment[]) =>
    renderToStaticMarkup(createElement(AssessmentHistory, { entries }));

  /** The badge is the one pill with text beside its icon; the four dimension dots carry theirs in `sr-only`. */
  const badge = (markup: string) => /<\/svg>([^<]+)<\/span>/u.exec(markup)?.[1] ?? null;

  it("com overall, o selo é o que veio, mesmo que as dimensões digam outra coisa", () => {
    expect(badge(render([entry({ overall: "atencao" })]))).toBe(i18n.t(HEALTH_LABEL_KEYS.atencao));
  });

  it("sem overall, não há selo — o navegador não tira o pior das quatro", () => {
    expect(badge(render([entry({})]))).toBeNull();
  });

  it("o dublê da ficha carimba o overall de cada entrada, como o servidor", () => {
    const created = createRecord(
      makeProject({ id: "com-historico", languageName: "Língua com Histórico", healthHistory: [entry({})] }),
    );
    expect(created.ok).toBe(true);
    const { project } = readRecord("com-historico");
    expect(project.healthHistory?.[0]?.overall).toBe("critica");
  });
});

describe("o cartão sem o bloco derived desenha o vazio (OBT-694, item 5)", () => {
  it("nenhum progresso calculado no navegador: o número dá lugar ao traço", () => {
    const raw = makeProject({ id: "cru", languageName: "Língua Crua", translatedUnits: 50, totalUnits: 100 });
    const markup = renderToStaticMarkup(
      createElement(ProjectCardDiario, { project: raw, index: 0, onOpen: () => undefined }),
    );
    expect(markup).not.toContain("50%");
    expect(markup).toContain("—");
    const arcs = [...markup.matchAll(/stroke-dasharray="([\d.]+) /gu)].map((match) => Number(match[1]));
    expect(arcs).toHaveLength(3);
    expect(arcs.every((length) => length === 0)).toBe(true);
  });

  it("a lista do dublê — a que o Início lê sem servidor — traz derived em todo projeto, como a busca", async () => {
    const list = await projectsAPI.list();
    expect(list.length).toBeGreaterThan(0);
    expect(list.every((project) => project.derived !== undefined)).toBe(true);
  });
});
