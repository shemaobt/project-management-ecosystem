import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
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
const { AvaliacaoView } = await import("..");
const { PrayerConsent } = await import(
  "../../ficha/tabs/saude/PrayerConsent"
);
const { PrayerRequestStep } = await import("../PrayerRequestStep");
const { Completion } = await import("../Completion");
const { emptyDraft } = await import("../../../../utils/assessment");
const { createEmptyProject } = await import("../../../../fixtures/blank");
const { GUIDING_QUESTIONS } = await import(
  "../../../../constants/healthQuestions"
);
const { HEALTH_DIMENSIONS } = await import("../../../../constants/health");
import type { AssessmentDraft } from "../../../../types/assessment";

const NOW = new Date(2026, 4, 14);

const project = {
  ...createEmptyProject("kadiweu"),
  languageName: "Kadiwéu",
  location: "Brazil",
};

const draft = (over: Partial<AssessmentDraft> = {}): AssessmentDraft => ({
  ...emptyDraft("kadiweu", NOW),
  ...over,
});

const view = (over: Partial<AssessmentDraft> = {}) =>
  renderToStaticMarkup(
    createElement(
      MemoryRouter,
      null,
      createElement(AvaliacaoView, {
        project,
        draft: draft(over),
        onStep: () => {},
        onFinish: () => {},
      }),
    ),
  );

beforeEach(async () => {
  await i18n.changeLanguage("pt");
});

describe("o roteiro é o produto: cada dimensão abre com o que perguntar", () => {
  it("a primeira dimensão mostra suas quatro perguntas-guia", () => {
    const markup = view();

    expect(markup).toContain(i18n.t("hw_ask"));
    for (const key of GUIDING_QUESTIONS.emotional) {
      expect(markup, key).toContain(i18n.t(key));
    }
  });

  it("as perguntas vêm de uma fonte só, e a tela diz de onde", () => {
    expect(view()).toContain(i18n.t("hw_questions_source"));
  });

  it("a dimensão traz também a pergunta de abertura e o campo de anotação", () => {
    const markup = view();

    expect(markup).toContain(i18n.t(HEALTH_DIMENSIONS[0].questionKey));
    expect(markup).toContain(i18n.t("hw_note_label"));
    expect(markup).toContain(i18n.t("hw_note_matters"));
  });
});

describe("pular é resposta, e a tela diz o que isso grava", () => {
  it("sem nota, a dimensão se anuncia como não avaliada", () => {
    const markup = view();

    expect(markup).toContain(i18n.t("hw_skipped"));
    expect(markup).toContain(i18n.t("hw_skip_note"));
  });
});

describe("nenhum arquivo em lugar nenhum do fluxo", () => {
  const FLOW = new URL("..", import.meta.url).pathname;
  const FILE_API =
    /createObjectURL|URL\.revokeObjectURL|new Blob\(|\.download\b|download=|utils\/export/u;

  const files = readdirSync(FLOW, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".tsx"))
    .map((entry) => entry.name);

  it("o fluxo tem os arquivos que a issue nomeia", () => {
    expect(files.length).toBeGreaterThanOrEqual(4);
  });

  for (const name of files) {
    it(`${name} não toca em nenhuma API de arquivo`, () => {
      expect(readFileSync(join(FLOW, name), "utf8")).not.toMatch(FILE_API);
    });
  }

  it("e a tela afirma isso em palavras, que é do que a FE-35 depende", () => {
    expect(view()).toContain(i18n.t("hw_no_file"));
  });
});

describe("a conversa é retomada sem custo quando cai no meio", () => {
  it("com algo já respondido, a tela diz de onde retomou", () => {
    const markup = view({
      ratings: {
        emotional: "atencao",
        relational: "",
        spiritual: "",
        physical: "",
      },
      savedAt: "2026-05-14",
    });

    expect(markup).toContain(
      i18n.t("hw_resumed", { date: "14 de mai. de 2026" }),
    );
  });

  it("num rascunho intocado, não promete retomada que não houve", () => {
    expect(view()).not.toContain(
      i18n.t("hw_resumed", { date: "14 de mai. de 2026" }),
    );
  });

  it("a tela promete o autosave por passo", () => {
    expect(view()).toContain(i18n.t("hw_autosaved"));
  });
});

describe("o cuidado pastoral é proposto com motivo, e espera confirmação", () => {
  const completion = (over: Partial<AssessmentDraft>) =>
    renderToStaticMarkup(
      createElement(Completion, { draft: draft(over), onChange: () => {} }),
    );

  it("uma crítica mostra a sugestão e o porquê", () => {
    const markup = completion({
      ratings: {
        emotional: "critica",
        relational: "",
        spiritual: "",
        physical: "",
      },
    });

    expect(markup).toContain(i18n.t("hw_pastoral_suggested"));
    expect(markup).toContain(
      i18n.t("hw_pastoral_reason", {
        dimension: i18n.t("d_emotional"),
        rating: i18n.t("health_critical"),
      }),
    );
  });

  it("a sugestão não vira decisão: “Não” segue marcado até alguém trocar", () => {
    const markup = completion({
      ratings: {
        emotional: "critica",
        relational: "",
        spiritual: "",
        physical: "",
      },
    });

    expect(markup).toContain(i18n.t("hw_pastoral_not_applied"));
    expect(markup).toMatch(
      /aria-pressed="true"[^>]*>[^<]*Não|Não[^<]*<\/button>/u,
    );
    expect(markup).not.toContain(i18n.t("hw_pastoral_who"));
  });

  it("sem nada crítico, a tela diz que ninguém pediu, sem esconder a opção", () => {
    const markup = completion({
      ratings: {
        emotional: "boa",
        relational: "boa",
        spiritual: "boa",
        physical: "boa",
      },
    });

    expect(markup).toContain(i18n.t("hw_pastoral_quiet"));
    expect(markup).toContain(i18n.t("hw_pastoral_now"));
  });

  it("quem for fazer só é perguntado depois do sim", () => {
    const markup = completion({ pastoral: "sim" });
    expect(markup).toContain(i18n.t("hw_pastoral_who"));
  });
});

describe("o pedido de oração passa pelo consentimento da FE-25, sem segundo caminho", () => {
  const step = (request: string) =>
    renderToStaticMarkup(
      createElement(PrayerRequestStep, {
        request,
        visibility: "coordenacao" as const,
        onRequest: () => {},
        onVisibility: () => {},
      }),
    );

  it("o consentimento renderizado aqui é o mesmo componente da aba Saúde", () => {
    const consent = renderToStaticMarkup(
      createElement(PrayerConsent, {
        value: "coordenacao",
        onChange: () => {},
      }),
    );

    expect(step("A equipe pediu oração pela chuva.")).toContain(consent);
  });

  it("sem pedido escrito, não há consentimento a dar", () => {
    expect(step("")).not.toContain(i18n.t("prayer_vis_label"));
    expect(step("")).toContain(i18n.t("hw_prayer_optional"));
  });
});

describe("as notas se leem sem depender de cor", () => {
  it("cada opção carrega o nome escrito, não só a tonalidade", () => {
    const markup = view();

    expect(markup).toContain(i18n.t("health_good"));
    expect(markup).toContain(i18n.t("health_attention"));
    expect(markup).toContain(i18n.t("health_critical"));
  });

  it("o resumo diz a leitura geral por extenso", () => {
    const markup = renderToStaticMarkup(
      createElement(Completion, {
        draft: draft({
          ratings: {
            emotional: "atencao",
            relational: "",
            spiritual: "",
            physical: "",
          },
        }),
        onChange: () => {},
      }),
    );

    expect(markup).toContain(i18n.t("hw_overall"));
    expect(markup).toContain(i18n.t("health_attention"));
    expect(markup).toContain(i18n.t("hw_skipped"));
  });
});
