import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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
const { REGION_TEAMS } = await import("../../../../fixtures/regions");
const { useRegionsStore } = await import("../../../../stores/regionsStore");
const { makeEmptyProject } = await import("../../../../stores/recordStore");
const { EquipeTab } = await import("../tabs/Equipe");
const { RolesPanel } = await import("../tabs/equipe/RegionalRoles");
const {
  getRegion,
  getRegionLabelKey,
  resolveProjectRoles,
} = await import("../../../../utils/region");

const EMPTY_TEAM = { coordinator: "", obtLab: "", resourceCircle: "" };

const noop = () => {};

type Values = Partial<ReturnType<typeof makeEmptyProject>>;

const handle = (values: Values = {}) => ({
  values: { ...makeEmptyProject(), ...values },
  isNew: false,
  hasChanges: false,
  missing: [],
  set: noop,
  update: noop,
  discard: noop,
});

const tab = (mode: "ver" | "editar", values: Values = {}) =>
  renderToStaticMarkup(
    createElement(
      MemoryRouter,
      null,
      createElement(EquipeTab, { mode, draft: handle(values) }),
    ),
  );

const roles = (location: string) =>
  renderToStaticMarkup(
    createElement(
      MemoryRouter,
      null,
      createElement(RolesPanel, {
        roles: resolveProjectRoles(
          { location },
          useRegionsStore.getState().regions,
        ),
        regionLabelKey: getRegionLabelKey(getRegion({ location })),
      }),
    ),
  );

const PEOPLED: Values = {
  team: "JOCUM Porto Velho",
  ywamBase: "JOCUM Porto Velho",
  teamLeader: "Rodolfo / Debora",
  teamLeaderContact: "rodolfo@exemplo.org",
  mentor: "Suzuki",
  mentorContact: "+55 69 90000-0000",
  teamContact: "Rafa / Ciro",
  partnerOrg: "Seed Company",
  translators: "Ana Beatriz, Bruno Melo",
  technicalReviewers: "Carla Nunes",
  location: "Brazil, Rondônia",
};

beforeEach(async () => {
  await i18n.changeLanguage("pt");
  REGION_TEAMS["south-america"] = {
    coordinator: "Coordenadora Regional",
    obtLab: "Operacional Regional",
    resourceCircle: "Intercessora Regional",
  };
  useRegionsStore.setState({ regions: [], hydrated: false });
  await useRegionsStore.getState().hydrate();
});

afterEach(() => {
  REGION_TEAMS["south-america"] = { ...EMPTY_TEAM };
  useRegionsStore.setState({ regions: [], hydrated: false });
});

describe("a aba Equipe renderizada", () => {
  it("mostra cada pessoa do projeto no modo ver", () => {
    const markup = tab("ver", PEOPLED);

    for (const value of [
      "JOCUM Porto Velho",
      "Rodolfo / Debora",
      "rodolfo@exemplo.org",
      "Suzuki",
      "Rafa / Ciro",
      "Seed Company",
      "Ana Beatriz",
      "Bruno Melo",
      "Carla Nunes",
    ]) {
      expect(markup, value).toContain(value);
    }
    expect(markup).not.toContain("undefined");
    expect(markup).not.toContain("NaN");
  });

  it("mostra cada pessoa do projeto no modo editar", () => {
    const markup = tab("editar", PEOPLED);

    for (const value of [
      "JOCUM Porto Velho",
      "Rodolfo / Debora",
      "rodolfo@exemplo.org",
      "Ana Beatriz",
      "Carla Nunes",
    ]) {
      expect(markup, value).toContain(value);
    }
  });

  it("compõe a ficha vazia com travessão, sem buraco nem undefined", () => {
    const markup = tab("ver");
    expect(markup.match(/—/g)?.length).toBeGreaterThanOrEqual(6);
    expect(markup).not.toContain("undefined");
  });

  it("o par que o campo registra junto continua junto na lista", () => {
    const markup = tab("ver", { translators: "Pati & Marcos, Ana" });
    expect(markup).toContain("Pati &amp; Marcos");
  });
});

describe("os três papéis da região aparecem sem virar campo", () => {
  it("os três aparecem nos dois modos, com o rótulo do organograma", () => {
    for (const mode of ["ver", "editar"] as const) {
      const markup = tab(mode, PEOPLED);
      expect(markup, mode).toContain(i18n.t("role_coordinator"));
      expect(markup, mode).toContain(i18n.t("role_obtlab"));
      expect(markup, mode).toContain(i18n.t("role_resource"));
      expect(markup, mode).toContain(i18n.t("f_roles_hint"));
    }
  });

  it("trocar o titular no organograma troca o nome renderizado", async () => {
    expect(roles("Brazil")).toContain("Coordenadora Regional");

    REGION_TEAMS["south-america"].coordinator = "Outra Pessoa";
    useRegionsStore.setState({ regions: [], hydrated: false });
    await useRegionsStore.getState().hydrate();

    const markup = roles("Brazil");
    expect(markup).toContain("Outra Pessoa");
    expect(markup).not.toContain("Coordenadora Regional");
  });

  it("o bloco dos papéis não tem nenhum campo editável", () => {
    const markup = roles("Brazil");
    expect(markup).not.toContain("<input");
    expect(markup).not.toContain("<textarea");
    expect(markup).not.toContain("<select");
    expect(markup).not.toContain("contenteditable");
  });

  it("leva para a área Equipe em vez de deixar editar aqui", () => {
    expect(roles("Brazil")).toContain('href="/equipe"');
  });

  it("região sem titular mostra a definir, não em branco", () => {
    const markup = roles("Uganda");
    expect(markup).toContain(i18n.t("sb_no_coordinator"));
  });
});

describe("os contatos são dados pessoais quando o país é sensível", () => {
  it("o aviso só aparece com a bandeira marcada", () => {
    expect(tab("ver", PEOPLED)).not.toContain(i18n.t("f_contact_sensitive"));
    expect(
      tab("ver", { ...PEOPLED, sensitiveCountry: true }),
    ).toContain(i18n.t("f_contact_sensitive"));
  });

  it("o contato continua legível para quem preenche o registro", () => {
    const markup = tab("ver", { ...PEOPLED, sensitiveCountry: true });
    expect(markup).toContain("rodolfo@exemplo.org");
    expect(markup).toContain("+55 69 90000-0000");
  });
});
