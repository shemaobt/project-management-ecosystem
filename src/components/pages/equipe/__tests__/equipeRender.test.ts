import { readFileSync } from "node:fs";
import { join } from "node:path";
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
import type { Region, RegionKey, RoleChange } from "../../../../types/region";
import type { SessionRole } from "../../../../types/session";
import { canWriteRegionTeam } from "../../../../utils/access";

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
  writes?: (key: Region["key"]) => boolean,
) =>
  renderToStaticMarkup(
    createElement(EquipeView, {
      regions,
      projects,
      changes,
      writes,
      onSave: () =>
        Promise.resolve({
          outcome: { changed: 0, filled: 0, cleared: 0 },
          failedRegions: [],
        }),
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

  it("nenhuma responsabilidade de papel fala a língua do Estrategista aposentado, em PT nem em EN (OBT-665, PME-ACE-088)", async () => {
    for (const language of ["pt", "en"]) {
      await i18n.changeLanguage(language);
      for (const role of ROLES) {
        expect(i18n.t(role.descriptionKey), `${language} ${role.key}`).not.toMatch(/estrat[eé]g|strateg/i);
      }
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
  it("as três mesas se leem na tela, e nenhum papel global (OBT-572)", () => {
    const markup = view([region("africa", "continent_africa")]);

    expect((markup.match(/<article/gu) ?? []).length).toBe(TEAM_BODIES.length);
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

describe("a Equipe só deixa editar as regiões onde a conta escreve (OBT-593)", () => {
  const two = () => [
    region("asia", "continent_asia"),
    region("africa", "continent_africa"),
  ];
  const disabledInputs = (markup: string) => (markup.match(/<input[^>]*disabled=""/g) ?? []).length;
  const inputs = (markup: string) => (markup.match(/<input/g) ?? []).length;
  const scopeOf = (list: Region["key"][] | null) => (key: Region["key"]) =>
    list === null || list.includes(key);

  it("admin + coordenação da Ásia: a Ásia editável, a África só leitura", () => {
    const markup = view(two(), [], undefined, scopeOf(["asia"]));
    expect(disabledInputs(markup)).toBe(inputs(markup) / 2);
    expect(markup).toContain(i18n.t("equipe_save"));
  });

  it("o Admin sozinho: tudo só leitura, e sem a barra de salvar", () => {
    const markup = view(two(), [], undefined, scopeOf([]));
    expect(disabledInputs(markup)).toBe(inputs(markup));
    expect(markup).not.toContain(i18n.t("equipe_save"));
  });

  it("plataforma e campo ausente: tudo editável, como hoje", () => {
    expect(disabledInputs(view(two(), [], undefined, scopeOf(null)))).toBe(0);
    expect(disabledInputs(view(two()))).toBe(0);
  });
});

describe("a Equipe só é editável para a coordenação e a plataforma, na região em que escrevem (OBT-620)", () => {
  const two = () => [
    region("south-america", "continent_south_america"),
    region("africa", "continent_africa"),
  ];
  const disabledInputs = (markup: string) => (markup.match(/<input[^>]*disabled=""/g) ?? []).length;
  const inputs = (markup: string) => (markup.match(/<input/g) ?? []).length;
  const as = (roles: SessionRole[], scope: RegionKey[] | null | undefined) =>
    view(two(), [], undefined, (key) => canWriteRegionTeam(roles, scope, key));

  it("a coordenação edita só a região em que escreve, com a barra de salvar e a instrução de digitar", () => {
    const markup = as(["coordinator"], ["south-america"]);
    expect(disabledInputs(markup)).toBe(inputs(markup) / 2);
    expect(markup).toContain(i18n.t("equipe_save"));
    expect(markup).toContain(i18n.t("equipe_fill_hint"));
  });

  it("a plataforma edita todas as regiões", () => {
    const markup = as(["admin"], null);
    expect(disabledInputs(markup)).toBe(0);
    expect(markup).toContain(i18n.t("equipe_save"));
  });

  it("OBT Lab, Resource Circle, Admin sozinho e coordenação sem região só leem: sem barra de salvar nem instrução de digitar", () => {
    const readers: [string, SessionRole[], RegionKey[] | undefined][] = [
      ["OBT Lab", ["obtLab"], ["africa"]],
      ["OBT Lab, campo ausente", ["obtLab"], undefined],
      ["Resource Circle", ["resourceCircle"], []],
      ["Resource Circle, campo ausente", ["resourceCircle"], undefined],
      ["Admin sozinho", ["admin"], []],
      ["Admin sozinho, campo ausente", ["admin"], undefined],
      ["coordenação sem região", ["coordinator"], []],
    ];
    for (const [name, roles, scope] of readers) {
      const markup = as(roles, scope);
      expect(disabledInputs(markup), name).toBe(inputs(markup));
      expect(markup, name).not.toContain(i18n.t("equipe_save"));
      expect(markup, name).not.toContain(i18n.t("equipe_fill_hint"));
      expect(markup, name).toContain(i18n.t("equipe_unassigned_count", { count: 6 }));
    }
  });

  it("onde a conta só lê, a tela diz de quem são os assentos; quem edita tudo não recebe o aviso", () => {
    const reason = i18n.t("equipe_seats_coordination_only", {
      regional: i18n.t("role_coordinator"),
    });
    for (const [roles, scope] of [
      [["obtLab"], ["africa"]],
      [["resourceCircle"], undefined],
      [["admin"], []],
      [["coordinator"], ["south-america"]],
    ] as [SessionRole[], RegionKey[] | undefined][]) {
      expect(as(roles, scope), roles.join("+")).toContain(reason);
    }
    expect(as(["admin"], null)).not.toContain(reason);
    expect(view(two())).not.toContain(reason);
  });

  it("a página pergunta o papel e o escopo da sessão, não só o escopo", () => {
    const page = readFileSync(join(process.cwd(), "src/components/pages/equipe/index.tsx"), "utf8")
      .replace(/\s+/gu, " ")
      .replace(/\( /gu, "(")
      .replace(/,? \)/gu, ")");
    expect(page).toContain("canWriteRegionTeam(user.roles, user.writeRegionScope, region)");
    expect(page).not.toContain("writesProjectIn");
  });
});
