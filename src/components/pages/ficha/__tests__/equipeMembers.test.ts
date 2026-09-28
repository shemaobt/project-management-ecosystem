import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ProjectMember } from "../../../../types/project";

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
const { makeEmptyProject } = await import("../../../../stores/recordStore");
const { formatDate } = await import("../../../../utils/format");
const { EquipeTab } = await import("../tabs/Equipe");
const { MembersPanel } = await import("../tabs/equipe/ProjectMembers");
const { FULL_ACCESS } = await import("../../../../utils/recordAccess");

const noop = () => {};

type Values = Partial<ReturnType<typeof makeEmptyProject>>;

const handle = (values: Values, saved: boolean) => {
  const project = { ...makeEmptyProject(), id: "kadiweu", ...values };
  return {
    values: project,
    saved: saved ? project : undefined,
    isNew: !saved,
    hasChanges: false,
    missing: [],
    set: noop,
    update: noop,
    typed: {},
    errors: [],
    errorsFor: () => [],
    discard: noop,
    place: FULL_ACCESS,
  };
};

const tab = (mode: "ver" | "editar", values: Values, saved: boolean) =>
  renderToStaticMarkup(
    createElement(
      MemoryRouter,
      null,
      createElement(EquipeTab, { mode, draft: handle(values, saved) }),
    ),
  );

const panel = (members: readonly ProjectMember[] | null, error: string | null = null) =>
  renderToStaticMarkup(createElement(MembersPanel, { members, error }));

const MEMBERS: ProjectMember[] = [
  { userId: "u-1", name: "Membro Um", role: "equipe", addedAt: "2026-09-01" },
  { userId: "u-2", name: "membro.dois@exemplo.test", role: "equipe", addedAt: "2026-09-27" },
];

beforeEach(async () => {
  await i18n.changeLanguage("pt");
});

describe("a lista de membros na aba Equipe — BE-18 (OBT-524)", () => {
  it("lista cada membro com o nome e a data de entrada", () => {
    const html = panel(MEMBERS);
    expect(html).toContain(i18n.t("f_members_title"));
    for (const member of MEMBERS) {
      expect(html).toContain(member.name);
      expect(html).toContain(
        i18n.t("f_members_since", { date: formatDate(member.addedAt, i18n.t("locale")) }),
      );
    }
    expect(html.indexOf("Membro Um")).toBeLessThan(html.indexOf("membro.dois"));
  });

  it("é só leitura: nenhum input, botão ou campo editável", () => {
    const html = panel(MEMBERS);
    for (const control of ["<input", "<textarea", "<select", "<button", "contenteditable"]) {
      expect(html).not.toContain(control);
    }
  });

  it("sem membros, diz isso em vez de uma lista vazia", () => {
    const html = panel([]);
    expect(html).toContain(i18n.t("f_members_empty"));
    expect(html).not.toContain("<li");
  });

  it("carregando e falha aparecem nos dois canais — texto e papel acessível", () => {
    const loading = panel(null);
    expect(loading).toContain('role="status"');
    expect(loading).toContain(i18n.t("loading"));
    expect(loading).not.toContain("undefined");

    const failed = panel(null, "Não foi possível carregar.");
    expect(failed).toContain('role="alert"');
    expect(failed).toContain("Não foi possível carregar.");
    expect(failed).not.toContain('role="status"');
  });

  it("o painel aparece nos dois modos para um registro salvo, e não para um projeto novo", () => {
    for (const mode of ["ver", "editar"] as const) {
      const saved = tab(mode, {}, true);
      expect(saved, mode).toContain(i18n.t("f_members_title"));
      expect(saved, mode).toContain('role="status"');
      expect(tab(mode, {}, false), mode).not.toContain(i18n.t("f_members_title"));
    }
  });

  it("os campos de texto da equipe continuam ao lado da lista", () => {
    const values: Values = {
      teamLeader: "Rodolfo / Debora",
      translators: "Ana Beatriz, Bruno Melo",
    };
    for (const mode of ["ver", "editar"] as const) {
      const html = tab(mode, values, true);
      expect(html, mode).toContain("Rodolfo / Debora");
      expect(html, mode).toContain("Ana Beatriz");
      expect(html, mode).toContain(i18n.t("f_members_title"));
    }
  });

  it("o texto fala nas duas línguas", async () => {
    await i18n.changeLanguage("en");
    expect(panel([])).toContain("No account is a member of this project yet.");
  });
});
