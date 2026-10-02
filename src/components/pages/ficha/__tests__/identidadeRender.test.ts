import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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
const { MOCK_SESSION_KEY, projectRecordAPI, projectsAPI } = await import(
  "../../../../fixtures"
);
const { REGION_CENTROIDS } = await import("../../../../constants/geo");
const { ROLE_DEFINITIONS } = await import("../../../../constants/roles");
const { SESSION_ROLE_LABEL_KEYS } = await import(
  "../../../../contexts/AuthContext"
);
const { makeEmptyProject, missingRequired } = await import(
  "../../../../stores/recordStore"
);
const { FULL_ACCESS, recordAccess } = await import(
  "../../../../utils/recordAccess"
);
const { makeProject } = await import("../../../../utils/__tests__/factory");
const { getRegionLabelKey } = await import("../../../../utils/region");
const { writableDraft } = await import("../useDraft");
const { IdentidadeTab } = await import("../tabs/Identidade");
const { EquipeTab } = await import("../tabs/Equipe");

const noop = () => {};

/** A handle as `useDraft` builds it for a record the server (or the double) answered. */
const handle = (saved: Project, isNew = false) => {
  const place = recordAccess(isNew ? undefined : saved, isNew, true);
  const values = {
    ...makeEmptyProject(),
    ...saved,
    readAs: isNew ? ("coordination" as const) : saved.readAs,
  };
  return {
    values,
    typed: {},
    saved: isNew ? undefined : saved,
    isNew,
    hasChanges: false,
    missing: missingRequired(values, place),
    place,
    errors: [],
    errorsFor: () => [],
    set: noop,
    update: noop,
    discard: noop,
  };
};

const render = (
  Tab: typeof IdentidadeTab,
  mode: "ver" | "editar",
  saved: Project,
  isNew = false,
) =>
  renderToStaticMarkup(
    createElement(
      MemoryRouter,
      null,
      createElement(Tab, { mode, draft: handle(saved, isNew) }),
    ),
  );

const inputTag = (markup: string, id: string) =>
  markup.match(new RegExp(`<input[^>]*id="${id}"[^>]*>`))?.[0] ?? "";

const disabled = (markup: string, id: string) =>
  / disabled=""/.test(inputTag(markup, id));

const PHRASE = () =>
  i18n.t("f_location_coordination_only", {
    global: i18n.t(SESSION_ROLE_LABEL_KEYS.globalStrategist),
    regional: i18n.t(ROLE_DEFINITIONS.coordinator.labelKey),
  });

const PLACE = "Peru, Vila Sintética";
const BASE = "Base Farol Sintético";

const truth = (over: Partial<Project> = {}): Project =>
  makeProject({
    id: "farol",
    languageName: "Língua Sintética",
    bridgeLanguage: "Espanhol",
    location: PLACE,
    location2: "Vale Sintético",
    team: BASE,
    ywamBase: BASE,
    teamContact: "+00 0000-0000",
    coords: [-70.1, -9.9],
    sensitiveCountry: true,
    ...over,
  });

/** What the server hands `obtLab` for the same record (OBT-528's `other` reduction). */
const reduced = (): Project =>
  truth({
    location: "south-america",
    location2: "",
    team: "",
    ywamBase: "",
    teamContact: "",
    sensitivity: "",
    coords: REGION_CENTROIDS["south-america"],
    readAs: "other",
  });

beforeEach(async () => {
  await i18n.changeLanguage("pt");
});

afterEach(() => storage.clear());

describe("aba Identidade por papel — o que o servidor mandou para quem lê", () => {
  it("coordenação vê o lugar real com o selo e edita", () => {
    const record = truth({ readAs: "coordination" });
    const view = render(IdentidadeTab, "ver", record);
    expect(view).toContain(PLACE);
    expect(view).toContain(i18n.t("d_sensitive_tag"));
    expect(view).not.toContain(PHRASE());

    const form = render(IdentidadeTab, "editar", record);
    for (const id of ["ficha-location", "ficha-location2", "ficha-lng", "ficha-lng-lat"]) {
      expect(disabled(form, id), id).toBe(false);
    }
    expect(inputTag(form, "ficha-location")).toContain(PLACE);
    expect(form).not.toContain(PHRASE());
  });

  it("obtLab vê a região e nunca o lugar, com local, local 2, coordenadas e marcação desabilitados e a frase", () => {
    const view = render(IdentidadeTab, "ver", reduced());
    expect(view).toContain(i18n.t("continent_south_america"));
    expect(view).not.toContain("south-america");
    expect(view).not.toContain(String(REGION_CENTROIDS["south-america"][0]));
    expect(view).toContain(i18n.t("d_sensitive_tag"));
    expect(view).toContain(PHRASE());

    const form = render(IdentidadeTab, "editar", reduced());
    for (const id of ["ficha-location", "ficha-location2", "ficha-lng", "ficha-lng-lat"]) {
      expect(disabled(form, id), id).toBe(true);
    }
    expect(inputTag(form, "ficha-location")).toContain(
      i18n.t("continent_south_america"),
    );
    expect(form).not.toContain(`value="${REGION_CENTROIDS["south-america"][0]}"`);
    const flag = form.match(/<button[^>]*id="ficha-sensitive"[^>]*>/)?.[0] ?? "";
    expect(flag).toContain('disabled=""');
    expect(form).toContain(PHRASE());
  });

  it("obtLab num registro aberto vê a verdade mas não edita o local", () => {
    const cleared = truth({ sensitiveCountry: false, readAs: "other" });
    expect(render(IdentidadeTab, "ver", cleared)).toContain(PLACE);
    const form = render(IdentidadeTab, "editar", cleared);
    expect(inputTag(form, "ficha-location")).toContain(PLACE);
    expect(disabled(form, "ficha-location")).toBe(true);
    expect(form).toContain(PHRASE());
  });

  it("uma resposta sem readAs lê como retida — o servidor antes da 528", () => {
    const form = render(IdentidadeTab, "editar", truth());
    expect(form).not.toContain(PLACE);
    expect(disabled(form, "ficha-location")).toBe(true);
  });

  it("ficha nova é editável por quem cria", () => {
    const form = render(IdentidadeTab, "editar", truth({ id: "novo" }), true);
    expect(disabled(form, "ficha-location")).toBe(false);
    expect(inputTag(form, "ficha-location")).toContain(PLACE);
    expect(form).not.toContain(PHRASE());
  });

  it("pelo dublê, a persona mock decide: obtLab lê a região, a coordenação a verdade", async () => {
    const sensitive = (await projectsAPI.list()).find((p) => p.sensitiveCountry)!;

    storage.setItem(MOCK_SESSION_KEY, "obtLab");
    const asOther = (await projectRecordAPI.read(sensitive.id)).project;
    expect(asOther.readAs).toBe("other");
    const otherView = render(IdentidadeTab, "ver", asOther);
    // The language name can carry a place of its own; the place field is what is withheld.
    expect(otherView).not.toContain(`>${sensitive.location}`);
    expect(otherView).toContain(i18n.t(getRegionLabelKey(asOther.derived!.region)));
    expect(disabled(render(IdentidadeTab, "editar", asOther), "ficha-location")).toBe(true);

    storage.setItem(MOCK_SESSION_KEY, "globalStrategist");
    const asCoordination = (await projectRecordAPI.read(sensitive.id)).project;
    expect(asCoordination.readAs).toBe("coordination");
    expect(render(IdentidadeTab, "ver", asCoordination)).toContain(
      `>${sensitive.location}`,
    );
  });
});

describe("aba Equipe e rascunho — o que o leitor não grava não aparece nem falta", () => {
  it("obtLab num registro sensível não vê nem edita base e contatos", () => {
    const form = render(EquipeTab, "editar", reduced());
    expect(disabled(form, "ficha-team")).toBe(true);
    expect(disabled(form, "ficha-team-contact")).toBe(true);
    expect(form).toContain(PHRASE());
    expect(render(EquipeTab, "ver", truth({ readAs: "other" }))).not.toContain(
      BASE,
    );
  });

  it("a coordenação edita a base e os contatos do registro sensível", () => {
    const form = render(EquipeTab, "editar", truth({ readAs: "coordination" }));
    expect(disabled(form, "ficha-team")).toBe(false);
    expect(inputTag(form, "ficha-team")).toContain(BASE);
  });

  it("a base não falta para quem não pode gravá-la, e continua faltando para quem pode", () => {
    const other = recordAccess(reduced(), false, true);
    expect(missingRequired({ ...makeEmptyProject() }, other)).not.toContain("team");
    expect(missingRequired({ ...makeEmptyProject() }, FULL_ACCESS)).toContain("team");
  });

  it("o rascunho de outra pessoa não reaparece para quem não pode gravá-lo", () => {
    const other = recordAccess(reduced(), false, true);
    const draft = {
      location: PLACE,
      team: BASE,
      notes: "texto livre",
      mentor: "segue",
      readAs: "coordination" as const,
    };
    expect(writableDraft(draft, other)).toEqual({ mentor: "segue" });
    expect(writableDraft(draft, FULL_ACCESS)).toEqual({
      location: PLACE,
      team: BASE,
      notes: "texto livre",
      mentor: "segue",
    });
  });
});
