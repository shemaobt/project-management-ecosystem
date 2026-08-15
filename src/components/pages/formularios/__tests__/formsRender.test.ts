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
const { createEmptyProject } = await import("../../../../fixtures/blank");
const { FormulariosView } = await import("..");
const en = (await import("../../../../i18n/locales/en.json")).default;
const pt = (await import("../../../../i18n/locales/pt-BR.json")).default;

type Project = ReturnType<typeof createEmptyProject>;

const NOW = new Date(2026, 4, 14);

const project = (over: Partial<Project> = {}): Project => ({
  ...createEmptyProject("kadiweu"),
  languageName: "Kadiwéu",
  location: "Brazil",
  team: "YWAM Aurora",
  lastUpdated: "2026-05-10",
  ...over,
});

const view = (projects: Project[] | null) =>
  renderToStaticMarkup(
    createElement(FormulariosView, { projects, submissions: [], now: NOW }),
  );

beforeEach(async () => {
  await i18n.changeLanguage("pt");
});

describe("os dois formulários se distinguem à primeira vista", () => {
  it("cada cartão diz a cadência, quem preenche e o mecanismo", () => {
    const markup = view([project()]);

    expect(markup).toContain(i18n.t("forms_pulse_title"));
    expect(markup).toContain(i18n.t("forms_health_title"));
    expect(markup).toContain(i18n.t("ritmo_monthly"));
    expect(markup).toContain(i18n.t("ritmo_quarterly"));
    expect(markup).toContain(i18n.t("forms_filler_leader"));
    expect(markup).toContain(i18n.t("forms_filler_obtlab"));
    expect(markup).toContain(i18n.t("forms_mechanism_file"));
    expect(markup).toContain(i18n.t("forms_mechanism_inapp"));
  });

  it("a Avaliação de Saúde diz que é no app e que não gera arquivo", () => {
    const markup = view([project()]);

    expect(markup).toContain(i18n.t("forms_health_mechanism"));
    expect(i18n.t("forms_health_mechanism")).toMatch(/não gera arquivo/iu);
  });
});

describe("nenhuma cópia promete um formato enquanto o GATE-03 estiver aberto", () => {
  const FORMAT = /\.(json|html|csv|pdf|xlsx?)\b/iu;

  it("nenhum valor de forms_* nos dois catálogos nomeia uma extensão", () => {
    for (const catalogue of [en, pt]) {
      for (const [key, value] of Object.entries(catalogue)) {
        if (!key.startsWith("forms_")) continue;
        expect(value, key).not.toMatch(FORMAT);
      }
    }
  });

  it("a tela renderizada não nomeia uma extensão", () => {
    expect(view([project()])).not.toMatch(FORMAT);
  });

  it("e diz, em palavras, que o formato ainda está em definição", () => {
    expect(view([project()])).toContain(i18n.t("forms_format_pending"));
  });
});

describe("o ciclo do Pulso aparece com a posição do projeto escolhido", () => {
  it("as cinco etapas aparecem, com quem faz cada uma", () => {
    const markup = view([project()]);

    for (const step of [
      "forms_step_generate",
      "forms_step_send",
      "forms_step_answer",
      "forms_step_import",
      "forms_step_archive",
    ]) {
      expect(markup, step).toContain(i18n.t(step));
    }
    expect(markup).toContain(i18n.t("forms_actor_leader"));
  });

  it("quem não reportou vê o ciclo começando em “Você gera”", () => {
    const markup = view([project({ lastUpdated: "2026-03-01" })]);

    expect(markup).toContain(
      i18n.t("forms_loop_open", { project: "Kadiwéu" }),
    );
  });

  it("quem já reportou vê o período fechado, em vez do mesmo texto para todos", () => {
    const markup = view([project({ lastUpdated: "2026-05-10" })]);

    expect(markup).toContain(
      i18n.t("forms_loop_closed", { project: "Kadiwéu" }),
    );
    expect(markup).not.toContain(
      i18n.t("forms_loop_open", { project: "Kadiwéu" }),
    );
  });

  it("as cinco perguntas do Pulso aparecem", () => {
    const markup = view([project()]);

    expect(markup).toContain(i18n.t("forms_questions_title"));
    expect(markup).toContain(i18n.t("forms_q_chapters"));
    expect(markup).toContain(i18n.t("forms_q_prayer"));
  });
});

describe("a tela mostra quem ainda não reportou neste período", () => {
  it("lista os pendentes e não lista quem reportou", () => {
    const markup = view([
      project({ id: "atrasado", languageName: "Baikeno", lastUpdated: "2026-02-01" }),
      project({ id: "emdia", languageName: "Asháninka", lastUpdated: "2026-05-09" }),
    ]);

    expect(markup).toContain(i18n.t("forms_pending_title"));
    expect(markup).toContain("Baikeno");
    expect(markup).toContain(
      i18n.t("forms_readiness", { reported: 1, total: 2 }),
    );
  });

  it("com todos em dia, afirma isso em vez de mostrar uma lista vazia", () => {
    const markup = view([project({ lastUpdated: "2026-05-09" })]);

    expect(markup).toContain(i18n.t("forms_pending_none"));
  });

  it("diz de onde o sinal vem, para não parecer que um Pulso chegou", () => {
    expect(view([project()])).toContain(i18n.t("forms_reporting_note"));
  });
});

describe("o arquivo dos recebidos não inventa o que não chegou", () => {
  it("está vazio e explica o que vai guardar", () => {
    const markup = view([project()]);

    expect(markup).toContain(i18n.t("forms_received_title"));
    expect(markup).toContain(i18n.t("forms_received_empty"));
  });
});

describe("a tela não promete o que a onda 1 não entrega", () => {
  it("não mostra botões mortos de gerar, importar e baixar", () => {
    const markup = view([project()]);

    expect(markup).not.toContain(i18n.t("forms_generate"));
    expect(markup).not.toContain(i18n.t("forms_import"));
    expect(markup).not.toContain(i18n.t("forms_download"));
    expect(markup).toContain(i18n.t("forms_actions_pending"));
  });

  it("enquanto carrega, não afirma que não há projeto", () => {
    const markup = view(null);

    expect(markup).not.toContain(i18n.t("forms_no_projects"));
    expect(markup).toContain(i18n.t("loading"));
  });

  it("sem nenhum projeto, explica o que fazer em vez de mostrar cartões vazios", () => {
    const markup = view([]);

    expect(markup).toContain(i18n.t("forms_no_projects"));
    expect(markup).not.toContain(i18n.t("forms_pulse_title"));
  });
});
