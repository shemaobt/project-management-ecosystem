/**
 * OBT-616 — the ficha says why a project is sensitive: by its country on the Admin's list, or by
 * its own mark. The pair it reads is the server's (`sensitiveCountry` and `listedCountries`), and
 * the box a list holds is locked rather than offered: the server raises it again on any save.
 */
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
const { makeEmptyProject, missingRequired } = await import(
  "../../../../stores/recordStore"
);
const { recordAccess } = await import("../../../../utils/recordAccess");
const { makeProject } = await import("../../../../utils/__tests__/factory");
const { sensitiveMark } = await import("../../../../utils/sensitiveMark");
const { IdentidadeTab } = await import("../tabs/Identidade");

const noop = () => {};

const handle = (saved: Project) => {
  const place = recordAccess(saved, false, true, true);
  const values = { ...makeEmptyProject(), ...saved };
  return {
    values,
    typed: {},
    saved,
    isNew: false,
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

const render = (mode: "ver" | "editar", saved: Project) =>
  renderToStaticMarkup(
    createElement(
      MemoryRouter,
      null,
      createElement(IdentidadeTab, { mode, draft: handle(saved) }),
    ),
  );

const record = (over: Partial<Project>): Project =>
  makeProject({
    id: "vale",
    languageName: "Língua do Vale",
    location: "Teerã, Irã",
    readAs: "coordination",
    ...over,
  });

const box = (markup: string) =>
  markup.match(/<button[^>]*id="ficha-sensitive"[^>]*>/)?.[0] ?? "";

const said = (markup: string) =>
  markup.match(/data-sensitive-mark="([^"]+)"/)?.[1] ?? null;

beforeEach(async () => {
  await i18n.changeLanguage("pt");
});

afterEach(() => storage.clear());

describe("a marca por país e a marca por projeto (OBT-616)", () => {
  it("a marca pelo país trava a caixa e nomeia o país da lista", () => {
    const form = render(
      "editar",
      record({ sensitiveCountry: true, listedCountries: ["Irã"] }),
    );

    expect(said(form)).toBe("country");
    expect(box(form)).toContain('disabled=""');
    expect(form).toContain(
      i18n.t("f_sensitive_by_country", { countries: "Irã" }),
    );
  });

  it("a marca própria fica editável e diz que o país não está na lista", () => {
    const form = render(
      "editar",
      record({ location: "Roraima, Brasil", sensitiveCountry: true, listedCountries: [] }),
    );

    expect(said(form)).toBe("project");
    expect(box(form)).not.toContain('disabled=""');
    expect(form).toContain(i18n.t("f_sensitive_by_project"));
  });

  it("um projeto de país listado ainda sem marca diz que ela liga ao salvar", () => {
    const form = render(
      "editar",
      record({ sensitiveCountry: false, listedCountries: ["Irã"] }),
    );

    expect(said(form)).toBe("listedUnsaved");
    expect(box(form)).not.toContain('disabled=""');
    expect(form).toContain(
      i18n.t("f_sensitive_listed_unsaved", { countries: "Irã" }),
    );
  });

  it("um projeto aberto fora da lista não diz marca nenhuma", () => {
    const form = render(
      "editar",
      record({ location: "Laos", sensitiveCountry: false, listedCountries: [] }),
    );

    expect(said(form)).toBeNull();
    expect(form).toContain(i18n.t("f_sensitive_hint"));
  });

  it("a ficha em leitura diz por que o projeto é sensível", () => {
    const byCountry = render(
      "ver",
      record({ sensitiveCountry: true, listedCountries: ["Irã"] }),
    );
    const byProject = render(
      "ver",
      record({ location: "Roraima, Brasil", sensitiveCountry: true, listedCountries: [] }),
    );

    expect(byCountry).toContain(i18n.t("d_sensitive_by_country", { countries: "Irã" }));
    expect(byProject).toContain(i18n.t("d_sensitive_by_project"));
  });

  it("a dica da caixa diz o que cada marca faz e onde está a lista", () => {
    const hint = i18n.t("f_sensitive_hint");

    expect(hint).toContain("marca por país");
    expect(hint).toContain("marca por projeto");
    expect(hint).toContain("nunca a desliga");
    expect(hint).toContain("Acesso");
  });

  it("sem resposta do servidor sobre a lista, a marca é a do projeto", () => {
    expect(sensitiveMark(true, undefined)).toBe("project");
    expect(sensitiveMark(false, undefined)).toBe("none");
  });
});
