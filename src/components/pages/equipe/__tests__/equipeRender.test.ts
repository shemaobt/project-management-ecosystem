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
const { EquipeView } = await import("..");
const { SaveSummary } = await import("../SaveSummary");
const { TEAM_BODIES } = await import("../../../../constants/team");
const { ROLES } = await import("../../../../constants/roles");
const { createEmptyProject } = await import("../../../../fixtures/blank");
import type { Region, RoleChange } from "../../../../types/region";

const region = (
  key: Region["key"],
  labelKey: string,
  team: Partial<Region["team"]> = {},
): Region => ({
  key,
  labelKey,
  team: { coordinator: "", obtLab: "", resourceCircle: "", ...team },
});

const view = (
  regions: Region[] | null,
  changes: RoleChange[] = [],
  projects = [{ ...createEmptyProject("p1"), location: "Peru" }],
) =>
  renderToStaticMarkup(
    createElement(EquipeView, {
      regions,
      projects,
      changes,
      onSave: () => ({ changed: 0, filled: 0, cleared: 0 }),
    }),
  );

beforeEach(async () => {
  await i18n.changeLanguage("pt");
});

describe("cada região mostra seus três papéis em campos editáveis", () => {
  it("os três papéis aparecem com nome e responsabilidade", () => {
    const markup = view([region("south-america", "continent_south_america")]);

    for (const role of ROLES) {
      expect(markup, role.key).toContain(i18n.t(role.labelKey));
      expect(markup, role.key).toContain(i18n.t(role.descriptionKey));
    }
  });

  it("cada papel tem um campo de texto, não um rótulo estático", () => {
    const markup = view([region("africa", "continent_africa")]);
    const inputs = markup.match(/<input/gu) ?? [];

    expect(inputs.length).toBe(ROLES.length);
  });

  it("o nome já salvo chega preenchido no campo", () => {
    const markup = view([
      region("south-america", "continent_south_america", {
        coordinator: "Ana Beatriz Rocha",
      }),
    ]);

    expect(markup).toContain('value="Ana Beatriz Rocha"');
  });
});

describe("as mesas aparecem com escopo e propósito", () => {
  it("as três mesas e o papel global se leem na tela", () => {
    const markup = view([region("africa", "continent_africa")]);

    expect(markup).toContain(i18n.t("equipe_global"));
    expect(markup).toContain(i18n.t("equipe_global_scope"));
    for (const body of TEAM_BODIES) {
      expect(markup, body.key).toContain(i18n.t(body.labelKey));
      expect(markup, body.key).toContain(i18n.t(body.purposeKey));
    }
  });

  it("cada papel de região diz de qual mesa é parceria", () => {
    const markup = view([region("africa", "continent_africa")]);

    expect(markup).toContain(
      i18n.t("equipe_from_body", { body: i18n.t("equipe_body_projects") }),
    );
    expect(markup).toContain(
      i18n.t("equipe_from_body", {
        body: i18n.t("ritmo_role_resourcecircle"),
      }),
    );
  });
});

describe("o desenho não insinua linha de comando", () => {
  it("a tela afirma, em palavras, que nenhuma mesa manda na outra", () => {
    expect(view([region("africa", "continent_africa")])).toContain(
      i18n.t("equipe_no_hierarchy"),
    );
  });
});

describe("papel sem responsável é estado explícito, com caminho para preencher", () => {
  it("um papel vazio se anuncia, e a tela diz como preencher", () => {
    const markup = view([region("africa", "continent_africa")]);

    expect(markup).toContain(i18n.t("equipe_unassigned"));
    expect(markup).toContain(i18n.t("equipe_fill_hint"));
    expect(markup).toContain(
      i18n.t("equipe_unassigned_count", { count: 3 }),
    );
  });

  it("com todos os papéis ocupados, o aviso some", () => {
    const markup = view([
      region("africa", "continent_africa", {
        coordinator: "Josué",
        obtLab: "Grace",
        resourceCircle: "Samuel",
      }),
    ]);

    expect(markup).not.toContain(i18n.t("equipe_unassigned"));
  });
});

describe("quem trocou um papel, e quando, aparece na tela", () => {
  it("a última troca do papel se lê abaixo do campo", () => {
    const markup = view(
      [
        region("africa", "continent_africa", { coordinator: "Josué" }),
      ],
      [
        {
          regionKey: "africa",
          role: "coordinator",
          from: "",
          to: "Josué",
          changedBy: "Karina Marinho",
          changedAt: "2026-05-14",
        },
      ],
    );

    expect(markup).toContain("Karina Marinho");
    expect(markup).toContain(i18n.t("equipe_history_note"));
  });
});

describe("depois de salvar, a tela diz o que mudou e onde aparece", () => {
  const summary = (changed: number) =>
    renderToStaticMarkup(
      createElement(SaveSummary, {
        outcome: { changed, filled: changed, cleared: 0 },
      }),
    );

  it("nomeia quantos mudaram e os três lugares onde o nome passa a valer", () => {
    const markup = summary(2);

    expect(markup).toContain(i18n.t("equipe_saved_changed", { count: 2 }));
    expect(markup).toContain(i18n.t("equipe_appears_in"));
    expect(markup).toContain(i18n.t("equipe_appears_sidebar"));
    expect(markup).toContain(i18n.t("equipe_appears_ritmo"));
    expect(markup).toContain(i18n.t("equipe_appears_ficha"));
  });

  it("salvar sem mudança não finge propagação", () => {
    const markup = summary(0);

    expect(markup).toContain(i18n.t("equipe_nothing_changed"));
    expect(markup).not.toContain(i18n.t("equipe_appears_in"));
  });
});

describe("a tela não afirma o que ainda não sabe", () => {
  it("enquanto carrega, não diz que não há região", () => {
    const markup = view(null);

    expect(markup).not.toContain(i18n.t("equipe_no_regions"));
    expect(markup).toContain(i18n.t("loading"));
  });
});
