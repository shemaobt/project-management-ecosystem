import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { IntercessorEntry } from "../../../../types/prayer";

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
const { IntercessoresView } = await import("../IntercessoresPage");
const { IntercessorForm } = await import("../IntercessorForm");
const { EMPTY_CREATE_DRAFT } = await import("../../../../utils/intercessors");
const { default: ptBR } = await import("../../../../i18n/locales/pt-BR.json");
const { default: en } = await import("../../../../i18n/locales/en.json");

const refuseAsync = async () => false;

const ANA: IntercessorEntry = {
  id: "i1",
  name: "Ana Ribeiro",
  country: "BR",
  contactChannel: "email",
  contactHint: "an…@exemplo.org",
  sensitiveCountry: false,
  addedAt: "2026-08-14",
  consents: [
    { context: "network", basis: "verbal", recordedAt: "2026-08-14" },
    { context: "directory", basis: "verbal", recordedAt: "2026-08-14" },
  ],
};

const JOAO: IntercessorEntry = {
  id: "i2",
  name: "João Alves",
  country: "PT",
  contactChannel: "phone",
  contactHint: "…5678",
  sensitiveCountry: true,
  addedAt: "2026-08-10",
  consents: [
    { context: "network", basis: "verbal", recordedAt: "2026-08-10" },
    { context: "directory", basis: "verbal", recordedAt: "2026-08-10" },
  ],
};

const view = (people: IntercessorEntry[] | null, withheldCount = 0) =>
  renderToStaticMarkup(
    createElement(
      MemoryRouter,
      null,
      createElement(IntercessoresView, {
        people,
        withheldCount,
        onAdd: refuseAsync,
        onUpdate: refuseAsync,
        onRemove: refuseAsync,
        onRevealContact: async () => null,
      }),
    ),
  );

beforeEach(async () => {
  await i18n.changeLanguage("pt");
});

describe("a página abre com o cadastro e a sub-navegação da Oração", () => {
  it("traz os campos que o registro exige", () => {
    const markup = view([]);
    expect(markup).toContain(i18n.t("int_name"));
    expect(markup).toContain(i18n.t("int_country"));
    expect(markup).toContain(i18n.t("int_contact"));
    expect(markup).toContain(i18n.t("int_consent_basis"));
    expect(markup).toContain(i18n.t("int_list_in_directory"));
    expect(markup).toContain(i18n.t("int_add"));
  });

  it("liga de volta para o mural, na mesma sub-nav da FE-32", () => {
    const markup = view([]);
    expect(markup).toContain(i18n.t("oracao_sub_mural"));
    expect(markup).toContain(i18n.t("oracao_sub_rede"));
    expect(markup).toContain('href="/oracao"');
  });

  it("sem ninguém cadastrado, explica o que fazer em vez de dizer 'sem dados'", () => {
    const markup = view([]);
    expect(markup).toContain(i18n.t("int_empty"));
    expect(markup).not.toContain("undefined");
  });

  it("enquanto carrega, não afirma que a rede está vazia", () => {
    const markup = view(null);
    expect(markup).not.toContain(i18n.t("int_empty"));
    expect(markup).toContain(i18n.t("loading"));
  });
});

describe("a rede se lê agrupada por país, sem o contato em bloco", () => {
  const markup = () => view([ANA, JOAO]);

  it("cada país é um grupo, com o nome no idioma corrente", () => {
    expect(markup()).toContain("Brasil");
    expect(markup()).toContain("Portugal");
  });

  it("cada pessoa mostra nome, canal e a dica — nunca o contato completo", () => {
    const html = markup();
    expect(html).toContain("Ana Ribeiro");
    expect(html).toContain("an…@exemplo.org");
    expect(html).not.toContain("ana@exemplo.org");
    expect(html).toContain(i18n.t("int_channel_email"));
    expect(html).toContain("João Alves");
    expect(html).toContain(i18n.t("int_channel_phone"));
  });

  it("oferece ação de ligar ou mandar mensagem, não uma lista de telefones", () => {
    const html = markup();
    expect(html).toContain(i18n.t("int_message"));
    expect(html).toContain(i18n.t("int_call"));
  });

  it("um país sensível se anuncia na própria linha", () => {
    expect(markup()).toContain(i18n.t("f_sensitive"));
  });

  it("mostra desde quando a pessoa está na rede", () => {
    expect(markup()).toContain(i18n.t("int_added_on"));
  });

  it("cada linha oferece editar e remover", () => {
    const html = markup();
    expect(html).toContain(i18n.t("int_edit"));
    expect(html).toContain(i18n.t("int_remove"));
  });
});

describe("retido lê como retido", () => {
  it("um total retido aparece nomeado, não escondido no total", () => {
    const markup = view([ANA], 3);
    expect(markup).toContain(i18n.t("int_withheld_count", { count: 3 }));
  });

  it("sem ninguém retido, a nota some", () => {
    const markup = view([ANA], 0);
    expect(markup).not.toContain("int_withheld_count");
  });
});

describe("a contagem concorda com a lista", () => {
  it("uma pessoa fala no singular, duas no plural", () => {
    expect(view([ANA])).toContain(i18n.t("int_count", { count: 1 }));
    expect(view([ANA, JOAO])).toContain(i18n.t("int_count", { count: 2 }));
  });

  it("o catálogo carrega as duas formas e elas diferem em português", () => {
    expect(ptBR.int_count_one).toBeDefined();
    expect(ptBR.int_count_other).toBeDefined();
    expect(i18n.t("int_count", { count: 1 })).toBe("1 cadastrado");
    expect(i18n.t("int_count", { count: 2 })).toBe("2 cadastrados");
  });
});

describe("a página diz o que guarda e o que ainda não faz", () => {
  it("nomeia a obrigação de quem guarda contato de terceiros", () => {
    expect(view([])).toContain(i18n.t("int_privacy_note"));
  });

  it("diz que remover apaga, não esconde", () => {
    expect(ptBR.int_privacy_note).toContain("apaga o contato");
    expect(en.int_privacy_note).toContain("erases the contact");
  });

  it("nomeia a base do consentimento, exigida no cadastro", () => {
    expect(view([])).toContain(i18n.t("int_consent_basis_hint"));
  });

  it("não promete o envio que a onda 1 não entrega", () => {
    expect(view([])).toContain(i18n.t("int_send_pending"));
  });
});

describe("o campo de país é controlado, sempre", () => {
  const form = (country: string) =>
    renderToStaticMarkup(
      createElement(IntercessorForm, {
        draft: { ...EMPTY_CREATE_DRAFT, country },
        onChange: () => {},
        onSubmit: () => {},
        showing: [],
      }),
    );

  it("vazio é '' e o gatilho mostra o convite, não um país", () => {
    const markup = form("");
    expect(markup).toContain('data-placeholder=""');
    expect(markup).toContain(i18n.t("int_country_select"));
  });

  it("com país escolhido, o gatilho deixa de mostrar o convite", () => {
    expect(form("BR")).not.toContain('data-placeholder=""');
  });

  it("o valor entregue ao Radix nunca é undefined, que o deixaria descontrolado", () => {
    const source = readFileSync(
      join(process.cwd(), "src/components/pages/intercessores/IntercessorForm.tsx"),
      "utf8",
    );
    expect(source).toContain("value={draft.country}");
    expect(source).not.toMatch(/value=\{[^}]*\|\|[^}]*undefined[^}]*\}/u);
  });
});

describe("a página fala inglês quando o idioma muda", () => {
  it("troca o grupo de país junto com a interface", async () => {
    await i18n.changeLanguage("en");
    const markup = view([ANA, JOAO]);

    expect(markup).toContain("Brazil");
    expect(markup).toContain(en.int_name);
    expect(markup).not.toContain(ptBR.int_privacy_note);

    await i18n.changeLanguage("pt");
  });
});
