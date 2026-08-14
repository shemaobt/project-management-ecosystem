import { describe, expect, it } from "vitest";
import { COUNTRY_CODES, isCountryCode } from "../../constants/countries";
import type { Intercessor } from "../../types/prayer";
import { countryName, listCountries } from "../countries";
import {
  contactChannel,
  groupByCountry,
  makeIntercessor,
  missingFields,
  toDraft,
} from "../intercessors";

const person = (over: Partial<Intercessor> = {}): Intercessor => ({
  id: "i1",
  name: "Ana Ribeiro",
  country: "BR",
  contact: "ana@exemplo.org",
  addedAt: "2026-08-14",
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
      person({ id: "a", country: "BR" }),
      person({ id: "b", country: "BR" }),
      person({ id: "c", country: "BR" }),
    ];
    const groups = groupByCountry(network, "pt-BR");

    expect(groups).toHaveLength(1);
    expect(groups[0].code).toBe("BR");
    expect(groups[0].people).toHaveLength(3);
  });

  it("trocar o idioma renomeia o grupo sem parti-lo", () => {
    const network = [person({ id: "a" }), person({ id: "b" })];
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
      person({ id: "a", country: "ZA" }),
      person({ id: "b", country: "BR" }),
      person({ id: "c", country: "AO" }),
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

  it("o formulário nomeia tudo que falta de uma vez", () => {
    expect(missingFields({ name: "", country: "", contact: "" })).toEqual([
      "name",
      "country",
      "contact",
    ]);
    expect(
      missingFields({ name: "Ana", country: "BR", contact: "ana@exemplo.org" }),
    ).toEqual([]);
    expect(
      missingFields({ name: "  ", country: "BR", contact: "ana@exemplo.org" }),
    ).toEqual(["name"]);
    expect(
      missingFields({ name: "Ana", country: "Brasil", contact: "ana@x.org" }),
    ).toEqual(["country"]);
  });

  it("um cadastro incompleto não vira registro", () => {
    expect(
      makeIntercessor({ name: "Ana", country: "BR", contact: "oi" }, "i1"),
    ).toBeNull();
  });

  it("um cadastro completo guarda o nome aparado e a data de entrada", () => {
    const made = makeIntercessor(
      { name: "  Ana Ribeiro  ", country: "BR", contact: " ana@exemplo.org " },
      "i1",
      new Date(2026, 7, 14),
    );
    expect(made).toEqual({
      id: "i1",
      name: "Ana Ribeiro",
      country: "BR",
      contact: "ana@exemplo.org",
      addedAt: "2026-08-14",
    });
  });

  it("editar parte do rascunho do registro que já existe", () => {
    expect(toDraft(person())).toEqual({
      name: "Ana Ribeiro",
      country: "BR",
      contact: "ana@exemplo.org",
    });
  });
});

describe("a rede não é o papel da plataforma", () => {
  it("um intercessor da rede não carrega papel nem região", () => {
    const keys = Object.keys(person()).sort();
    expect(keys).toEqual(["addedAt", "contact", "country", "id", "name"]);
    for (const forbidden of ["role", "roleKey", "region", "regionKey", "userId"]) {
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

describe("dentro do país, as pessoas saem em ordem", () => {
  it("ordena por nome", () => {
    const groups = groupByCountry(
      [
        person({ id: "a", name: "Zeca" }),
        person({ id: "b", name: "Ana" }),
        person({ id: "c", name: "Marcos" }),
      ],
      "pt-BR",
    );
    expect(groups[0].people.map((entry) => entry.name)).toEqual([
      "Ana",
      "Marcos",
      "Zeca",
    ]);
  });

  it("uma rede vazia não inventa grupo", () => {
    expect(groupByCountry([], "pt-BR")).toEqual([]);
  });
});
