import { describe, expect, it } from "vitest";
import { COUNTRY_CODES, isCountryCode } from "../../constants/countries";
import type { IntercessorEntry } from "../../types/prayer";
import { countryName, listCountries } from "../countries";
import {
  contactChannel,
  groupByCountry,
  hasConsent,
  makeIntercessorCreate,
  makeIntercessorUpdate,
  matchesQuery,
  missingCreateFields,
  missingEditFields,
  toEditDraft,
  type IntercessorCreateDraft,
} from "../intercessors";

const CREATE_DRAFT: IntercessorCreateDraft = {
  name: "Ana Ribeiro",
  country: "BR",
  contact: "ana@exemplo.org",
  sensitiveCountry: false,
  consentBasis: "verbal, no encontro regional",
  listInDirectory: true,
};

const entry = (over: Partial<IntercessorEntry> = {}): IntercessorEntry => ({
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
  ...over,
});

describe("o país é chave, não texto livre", () => {
  it("o mesmo código rende o nome de cada idioma", () => {
    expect(countryName("BR", "pt-BR")).toBe("Brasil");
    expect(countryName("BR", "en")).toBe("Brazil");
    expect(countryName("MZ", "pt-BR")).toBe("Moçambique");
    expect(countryName("MZ", "en")).toBe("Mozambique");
  });

  it("Brasil, Brazil e BR não podem virar três grupos", () => {
    const network = [
      entry({ id: "a", country: "BR" }),
      entry({ id: "b", country: "BR" }),
      entry({ id: "c", country: "BR" }),
    ];
    const groups = groupByCountry(network, "pt-BR");

    expect(groups).toHaveLength(1);
    expect(groups[0].code).toBe("BR");
    expect(groups[0].people).toHaveLength(3);
  });

  it("trocar o idioma renomeia o grupo sem parti-lo", () => {
    const network = [entry({ id: "a" }), entry({ id: "b" })];
    const pt = groupByCountry(network, "pt-BR");
    const en = groupByCountry(network, "en");

    expect(pt[0].name).toBe("Brasil");
    expect(en[0].name).toBe("Brazil");
    expect(pt[0].code).toBe(en[0].code);
    expect(pt[0].people).toHaveLength(en[0].people.length);
  });

  it("um país fora da lista não é aceito no cadastro", () => {
    expect(isCountryCode("BR")).toBe(true);
    expect(isCountryCode("Brasil")).toBe(false);
    expect(isCountryCode("br")).toBe(false);
    expect(isCountryCode("")).toBe(false);
    expect(isCountryCode("ZZ")).toBe(false);
  });

  it("a lista não tem código repetido e todo código tem nome", () => {
    expect(new Set(COUNTRY_CODES).size).toBe(COUNTRY_CODES.length);
    const options = listCountries("pt-BR");
    expect(options).toHaveLength(COUNTRY_CODES.length);
    expect(options.every((option) => option.name.length > 0)).toBe(true);
    expect(options.every((option) => option.name !== option.code)).toBe(true);
  });

  it("a lista chega ordenada pelo nome do idioma corrente", () => {
    for (const locale of ["pt-BR", "en"]) {
      const names = listCountries(locale).map((option) => option.name);
      const sorted = [...names].sort((a, b) => a.localeCompare(b, locale));
      expect(names, locale).toEqual(sorted);
    }
  });

  it("os grupos saem na ordem do idioma, com acento no lugar certo", () => {
    const network = [
      entry({ id: "a", country: "ZA" }),
      entry({ id: "b", country: "BR" }),
      entry({ id: "c", country: "AO" }),
    ];

    expect(groupByCountry(network, "pt-BR").map((group) => group.name)).toEqual([
      "África do Sul",
      "Angola",
      "Brasil",
    ]);

    expect(groupByCountry(network, "en").map((group) => group.name)).toEqual([
      "Angola",
      "Brazil",
      "South Africa",
    ]);
  });
});

describe("sem canal de contato o cadastro não serve", () => {
  it("reconhece e-mail", () => {
    expect(contactChannel("ana@exemplo.org")).toBe("email");
    expect(contactChannel("  ana@exemplo.org  ")).toBe("email");
  });

  it("reconhece telefone com pontuação", () => {
    expect(contactChannel("+55 11 98765-4321")).toBe("phone");
    expect(contactChannel("(11) 98765 4321")).toBe("phone");
  });

  it("recusa o que não é canal nenhum", () => {
    expect(contactChannel("")).toBeNull();
    expect(contactChannel("perguntar ao João")).toBeNull();
    expect(contactChannel("11 9876")).toBeNull();
    expect(contactChannel("ana@")).toBeNull();
    expect(contactChannel("@ana")).toBeNull();
  });

  it("o formulário de cadastro nomeia tudo que falta de uma vez", () => {
    expect(
      missingCreateFields({
        name: "",
        country: "",
        contact: "",
        sensitiveCountry: false,
        consentBasis: "",
        listInDirectory: false,
      }),
    ).toEqual(["name", "country", "contact", "consentBasis"]);
    expect(missingCreateFields(CREATE_DRAFT)).toEqual([]);
    expect(
      missingCreateFields({ ...CREATE_DRAFT, name: "  " }),
    ).toEqual(["name"]);
    expect(
      missingCreateFields({ ...CREATE_DRAFT, country: "Brasil" }),
    ).toEqual(["country"]);
    expect(
      missingCreateFields({ ...CREATE_DRAFT, consentBasis: "  " }),
    ).toEqual(["consentBasis"]);
  });

  it("um cadastro incompleto não vira registro", () => {
    expect(
      makeIntercessorCreate({ ...CREATE_DRAFT, contact: "oi" }),
    ).toBeNull();
    expect(
      makeIntercessorCreate({ ...CREATE_DRAFT, consentBasis: "" }),
    ).toBeNull();
  });

  it("um cadastro completo apara nome e base de consentimento", () => {
    const made = makeIntercessorCreate({
      ...CREATE_DRAFT,
      name: "  Ana Ribeiro  ",
      contact: " ana@exemplo.org ",
      consentBasis: "  verbal  ",
    });
    expect(made).toEqual({
      name: "Ana Ribeiro",
      country: "BR",
      contact: "ana@exemplo.org",
      sensitiveCountry: false,
      consentBasis: "verbal",
    });
  });
});

describe("editar não exige revelar o contato de novo", () => {
  it("o rascunho de edição parte sem contato — precisa ser revelado", () => {
    expect(toEditDraft(entry())).toEqual({
      name: "Ana Ribeiro",
      country: "BR",
      contact: "",
      contactRevealed: false,
      sensitiveCountry: false,
    });
  });

  it("nome e país continuam obrigatórios, contato vazio não é falta", () => {
    expect(
      missingEditFields({
        name: "",
        country: "",
        contact: "",
        contactRevealed: false,
        sensitiveCountry: false,
      }),
    ).toEqual(["name", "country"]);
  });

  it("um contato digitado por engano ainda é validado", () => {
    expect(
      missingEditFields({
        name: "Ana",
        country: "BR",
        contact: "oi",
        contactRevealed: true,
        sensitiveCountry: false,
      }),
    ).toEqual(["contact"]);
  });

  it("sem tocar no contato, a atualização não o envia", () => {
    const update = makeIntercessorUpdate({
      name: "Ana Beatriz",
      country: "BR",
      contact: "",
      contactRevealed: false,
      sensitiveCountry: true,
    });
    expect(update).toEqual({
      name: "Ana Beatriz",
      country: "BR",
      sensitiveCountry: true,
    });
  });

  it("tocando no contato, a atualização o carrega", () => {
    const update = makeIntercessorUpdate({
      name: "Ana",
      country: "BR",
      contact: " +55 11 98765-4321 ",
      contactRevealed: true,
      sensitiveCountry: false,
    });
    expect(update?.contact).toBe("+55 11 98765-4321");
  });
});

describe("a rede não é o papel da plataforma", () => {
  it("um intercessor da rede nunca carrega contato bruto, papel ou região", () => {
    const keys = Object.keys(entry()).sort();
    expect(keys).toEqual([
      "addedAt",
      "consents",
      "contactChannel",
      "contactHint",
      "country",
      "id",
      "name",
      "sensitiveCountry",
    ]);
    for (const forbidden of ["contact", "role", "roleKey", "region", "regionKey", "userId"]) {
      expect(keys, forbidden).not.toContain(forbidden);
    }
  });

  it("o país da rede é ISO, não a chave de região do organograma", () => {
    expect(isCountryCode("BR")).toBe(true);
    for (const region of [
      "south-america",
      "north-america",
      "africa",
      "asia",
      "oceania",
      "europe",
      "other",
    ]) {
      expect(isCountryCode(region), region).toBe(false);
    }
  });
});

describe("consentimento é lido por contexto", () => {
  it("cada contexto é uma pergunta separada", () => {
    const person = entry({
      consents: [{ context: "network", basis: "verbal", recordedAt: "2026-08-14" }],
    });
    expect(hasConsent(person, "network")).toBe(true);
    expect(hasConsent(person, "directory")).toBe(false);
    expect(hasConsent(person, "partner-export")).toBe(false);
  });
});

describe("a busca opera só sobre quem já chegou à tela", () => {
  it("casa por nome ou pelo nome do país no idioma corrente", () => {
    const ana = entry({ id: "a", name: "Ana Ribeiro", country: "BR" });
    expect(matchesQuery(ana, "ana", "Brasil")).toBe(true);
    expect(matchesQuery(ana, "brasil", "Brasil")).toBe(true);
    expect(matchesQuery(ana, "joão", "Brasil")).toBe(false);
  });

  it("busca vazia não filtra nada", () => {
    const ana = entry();
    expect(matchesQuery(ana, "", "Brasil")).toBe(true);
    expect(matchesQuery(ana, "   ", "Brasil")).toBe(true);
  });
});

describe("dentro do país, as pessoas saem em ordem", () => {
  it("ordena por nome", () => {
    const groups = groupByCountry(
      [
        entry({ id: "a", name: "Zeca" }),
        entry({ id: "b", name: "Ana" }),
        entry({ id: "c", name: "Marcos" }),
      ],
      "pt-BR",
    );
    expect(groups[0].people.map((person) => person.name)).toEqual([
      "Ana",
      "Marcos",
      "Zeca",
    ]);
  });

  it("uma rede vazia não inventa grupo", () => {
    expect(groupByCountry([], "pt-BR")).toEqual([]);
  });
});
