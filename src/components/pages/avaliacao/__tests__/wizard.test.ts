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
import type { Project } from "../../../../types/project";

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

function controlFor(markup: string, label: string): string {
  const end = markup.indexOf(`>${label}</button>`);
  if (end === -1) throw new Error(`sem controle para ${label}`);
  return markup.slice(markup.lastIndexOf("<button", end), end + 1);
}

const renderView = (
  subject: Project,
  over: Partial<AssessmentDraft> = {},
) =>
  renderToStaticMarkup(
    createElement(
      MemoryRouter,
      null,
      createElement(AvaliacaoView, {
        project: subject,
        draft: draft(over),
        onStep: () => {},
        onFinish: () => {},
      }),
    ),
  );

const view = (over: Partial<AssessmentDraft> = {}) => renderView(project, over);

const FLOW = new URL("..", import.meta.url).pathname;

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
    expect(controlFor(markup, i18n.t("hw_pastoral_no"))).toContain(
      'data-state="checked"',
    );
    expect(controlFor(markup, i18n.t("hw_pastoral_now"))).toContain(
      'data-state="unchecked"',
    );
    expect(markup).not.toContain(i18n.t("hw_pastoral_who"));
  });

  it("as três respostas são uma escolha só, não três paradas de tabulação", () => {
    const markup = completion({});

    for (const key of ["hw_pastoral_now", "hw_pastoral_30d", "hw_pastoral_no"]) {
      expect(controlFor(markup, i18n.t(key)), key).toContain('tabindex="-1"');
    }
    expect(markup).not.toContain("aria-pressed");
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

  it("o nível rede avisa que o enviado não pode ser recolhido — PT e EN", async () => {
    expect(step("A equipe pediu oração pela chuva.")).toContain(
      "Depois que um pedido é enviado à rede, ele não pode ser recolhido.",
    );

    const { default: en } = await import("../../../../i18n/locales/en.json");
    await i18n.changeLanguage("en");
    const english = step("A equipe pediu oração pela chuva.");
    await i18n.changeLanguage("pt");
    expect(english).toContain(en.prayer_vis_network_no_recall);
  });

  it("sem pedido escrito, não há consentimento a dar", () => {
    expect(step("")).not.toContain(i18n.t("prayer_vis_label"));
    expect(step("")).toContain(i18n.t("hw_prayer_optional"));
  });

  it("num sensível lido em branco, o campo é só leitura e vazio, e a nota diz por quê (OBT-655)", () => {
    const markup = renderToStaticMarkup(
      createElement(PrayerRequestStep, {
        request: "Orem pela viagem do mentor",
        visibility: "rede" as const,
        onRequest: () => {},
        onVisibility: () => {},
        locked: true,
      }),
    );
    const field = markup.match(/<textarea[^>]*>[^<]*<\/textarea>/)?.[0] ?? "";

    expect(field).toMatch(/\sdisabled=""/);
    expect(markup).not.toContain("Orem pela viagem do mentor");
    expect(markup).not.toContain(i18n.t("prayer_vis_label"));
    expect(markup).toContain(i18n.t("f_free_text_coordination_only").slice(0, 40));
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

describe("a leitura geral do resumo é prévia — quem conta é o servidor", () => {
  const completion = (over: Partial<AssessmentDraft>) =>
    renderToStaticMarkup(
      createElement(Completion, { draft: draft(over), onChange: () => {} }),
    );

  it("o resumo se marca como prévia, sempre", () => {
    const markup = completion({});
    expect(markup).toContain(i18n.t("hw_preview_tag"));
    expect(markup).toContain(i18n.t("hw_overall_preview_note"));
  });

  it("uma crítica avisa a consequência antes de salvar, não depois", () => {
    const markup = completion({
      ratings: {
        emotional: "critica",
        relational: "",
        spiritual: "",
        physical: "",
      },
    });
    expect(markup).toContain(i18n.t("hw_critical_notice"));
  });

  it("sem crítica, o aviso de consequência não aparece", () => {
    const markup = completion({
      ratings: {
        emotional: "boa",
        relational: "boa",
        spiritual: "boa",
        physical: "boa",
      },
    });
    expect(markup).not.toContain(i18n.t("hw_critical_notice"));
  });

  it("a nota geral diz que fica só no rascunho — a BE-07 não tem onde guardá-la", () => {
    expect(completion({})).toContain(i18n.t("hw_overallnote_local_only"));
  });
});

describe("o assistente chama o projeto sensível como a ficha o chama, nunca pela chave da região (OBT-659)", () => {
  // What the server hands the OBT Lab for a sensitive project with no public name: the region
  // key where the name was, and the bit that says it is not the language's own (OBT-560).
  const withheld = (region: string, over: Partial<Project> = {}): Project => ({
    ...createEmptyProject("sigiloso"),
    languageName: region,
    languageNameWithheld: true,
    location: region,
    sensitiveCountry: true,
    readAs: "other",
    ...over,
  });
  const heading = (markup: string) =>
    markup.match(/<h1[^>]*>([^<]*)<\/h1>/)?.[1] ?? "";
  const titled = (language: string) => i18n.t("hw_title", { language });
  const phrase = (regionKey: string) =>
    i18n.t("sensitive_project_named", { region: i18n.t(regionKey) });

  it("sem nome público, o título diz “Projeto sensível — África”, e “africa” não aparece na tela", () => {
    const markup = renderView(withheld("africa"));

    expect(heading(markup)).toBe(titled(phrase("continent_africa")));
    expect(heading(markup)).toBe("Como está a equipe Projeto sensível — África?");
    expect(markup).not.toContain("africa");
  });

  it("na região other, o título diz “Projeto sensível — América Central”, o nome que o PME dá a ela", () => {
    const markup = renderView(withheld("other"));

    expect(heading(markup)).toBe(titled(phrase("continent_other")));
    expect(heading(markup)).toContain("América Central");
    expect(markup).not.toMatch(/\bother\b/);
  });

  it("um nome público registrado chega pronto e é o nome do título", () => {
    const markup = renderView(withheld("africa", { languageName: "Sa'di" }));

    expect(heading(markup)).toContain("Sa&#x27;di");
    expect(markup).not.toContain(phrase("continent_africa"));
  });

  it("sem o bit, o nome é o nome — uma língua aberta não vira frase", () => {
    expect(heading(view())).toBe(titled("Kadiwéu"));
  });
});

describe("o assistente só imprime nome pelo dono do nome impresso (OBT-659)", () => {
  // The saved toast fires inside the page's submit handler, which a static render never runs.
  // What holds it is this sweep: no file of the wizard reads the raw field, so every name it
  // prints goes through `getLanguageNameDisplay`, whose own test keeps the key from showing.
  const corpus = readdirSync(FLOW, { withFileTypes: true })
    .filter((entry) => entry.isFile() && /\.tsx?$/u.test(entry.name))
    .map((entry) => entry.name);

  it("o corpus é o assistente inteiro, com a página que dispara o toast", () => {
    expect(corpus).toContain("index.tsx");
    expect(corpus).toContain("writerGate.ts");
    expect(corpus.some((name) => name.includes("test"))).toBe(false);
  });

  for (const name of corpus) {
    it(`${name} não lê languageName cru — título e toast passam por getLanguageNameDisplay`, () => {
      expect(readFileSync(join(FLOW, name), "utf8")).not.toMatch(/\blanguageName\b/u);
    });
  }
});
