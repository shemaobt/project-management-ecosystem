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
    raw: data,
  };
}

const storage = createMemoryStorage();
vi.stubGlobal("localStorage", storage);
vi.stubGlobal("window", { localStorage: storage });

const { usePrayerStore } = await import("../prayerStore");
const { resetIntercessorNetwork } = await import("../../fixtures/intercessors");

const KEY = "shema-intercessors-v1";

const ANA = {
  name: "Ana Ribeiro",
  country: "BR",
  contact: "ana@exemplo.org",
  sensitiveCountry: false,
  consentBasis: "verbal, no encontro regional de 2026",
  listInDirectory: true,
};

const JOAO = {
  name: "João Alves",
  country: "PT",
  contact: "+351 912 345 678",
  sensitiveCountry: false,
  consentBasis: "resposta por WhatsApp em 03/mar",
  listInDirectory: true,
};

const reset = () => {
  storage.clear();
  resetIntercessorNetwork();
  usePrayerStore.setState({ intercessors: [], withheldCount: 0, hydrated: true });
};

const network = () => usePrayerStore.getState().intercessors;
const persisted = () => storage.getItem(KEY) ?? "";

describe("cadastrar na rede", () => {
  beforeEach(reset);

  it("guarda o canal e a dica de contato — nunca o contato bruto", async () => {
    expect(await usePrayerStore.getState().addIntercessor(ANA)).toBe(true);
    expect(network()).toHaveLength(1);
    expect(network()[0]).toMatchObject({
      name: "Ana Ribeiro",
      country: "BR",
      contactChannel: "email",
    });
    expect(JSON.stringify(network())).not.toContain("ana@exemplo.org");
  });

  it("sem consentir em listar, a pessoa não aparece na lista — e o total retido sobe", async () => {
    const done = await usePrayerStore
      .getState()
      .addIntercessor({ ...ANA, listInDirectory: false });

    expect(done).toBe(true);
    expect(network()).toEqual([]);
    expect(usePrayerStore.getState().withheldCount).toBe(1);
  });

  it("recusa um cadastro sem canal de contato, sem gravar nada", async () => {
    const refused = await usePrayerStore
      .getState()
      .addIntercessor({ ...ANA, contact: "perguntar ao João" });

    expect(refused).toBe(false);
    expect(network()).toEqual([]);
  });

  it("recusa um país que não está na lista", async () => {
    expect(
      await usePrayerStore.getState().addIntercessor({ ...ANA, country: "Brasil" }),
    ).toBe(false);
    expect(network()).toEqual([]);
  });

  it("recusa um cadastro sem a base do consentimento", async () => {
    expect(
      await usePrayerStore.getState().addIntercessor({ ...ANA, consentBasis: "  " }),
    ).toBe(false);
    expect(network()).toEqual([]);
  });
});

describe("editar um cadastro", () => {
  beforeEach(async () => {
    reset();
    await usePrayerStore.getState().addIntercessor(ANA);
  });

  it("revela o contato atual sob demanda, uma pessoa por vez", async () => {
    const id = network()[0].id;
    expect(await usePrayerStore.getState().revealContact(id)).toBe(
      "ana@exemplo.org",
    );
  });

  it("troca o contato mantendo a data de entrada na rede", async () => {
    const person = network()[0];
    const done = await usePrayerStore.getState().updateIntercessor(person.id, {
      name: person.name,
      country: person.country,
      contact: "+55 11 98765-4321",
      contactRevealed: true,
      sensitiveCountry: false,
    });

    expect(done).toBe(true);
    expect(network()[0].contactChannel).toBe("phone");
    expect(network()[0].addedAt).toBe(person.addedAt);
  });

  it("editar sem tocar no contato mantém o canal como estava", async () => {
    const person = network()[0];
    await usePrayerStore.getState().updateIntercessor(person.id, {
      name: "Ana B. Ribeiro",
      country: person.country,
      contact: "",
      contactRevealed: false,
      sensitiveCountry: false,
    });

    expect(network()[0].name).toBe("Ana B. Ribeiro");
    expect(network()[0].contactChannel).toBe("email");
  });

  it("editar quem não existe não cria ninguém", async () => {
    expect(
      await usePrayerStore.getState().updateIntercessor("nope", {
        name: "X",
        country: "BR",
        contact: "",
        contactRevealed: false,
        sensitiveCountry: false,
      }),
    ).toBe(false);
    expect(network()).toHaveLength(1);
  });
});

describe("remover apaga o contato, não o esconde", () => {
  beforeEach(async () => {
    reset();
    await usePrayerStore.getState().addIntercessor(ANA);
    await usePrayerStore.getState().addIntercessor(JOAO);
  });

  const findByName = (name: string) => {
    const person = network().find((entry) => entry.name === name);
    if (!person) throw new Error(`${name} não está na rede`);
    return person;
  };

  it("a pessoa some da rede em memória", async () => {
    const ana = findByName("Ana Ribeiro");
    const joao = findByName("João Alves");
    await usePrayerStore.getState().removeIntercessor(ana.id);

    expect(network().map((person) => person.id)).toEqual([joao.id]);
  });

  it("e some também do que ficou gravado no navegador", async () => {
    const ana = findByName("Ana Ribeiro");
    expect(persisted()).toContain("Ana Ribeiro");

    await usePrayerStore.getState().removeIntercessor(ana.id);

    expect(persisted()).not.toContain("Ana Ribeiro");
    expect(persisted()).toContain("João Alves");
  });

  it("não sobra lápide nem marca de removido", async () => {
    const ana = findByName("Ana Ribeiro");
    await usePrayerStore.getState().removeIntercessor(ana.id);

    const stored = JSON.parse(persisted()) as {
      state: { intercessors: unknown[] };
    };
    expect(stored.state.intercessors).toHaveLength(1);
    expect(persisted()).not.toContain("removed");
    expect(persisted()).not.toContain("deleted");
  });

  it("remover quem não existe não mexe em ninguém", async () => {
    expect(await usePrayerStore.getState().removeIntercessor("nope")).toBe(
      false,
    );
    expect(network()).toHaveLength(2);
  });
});
