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

const KEY = "shema-intercessors-v1";

const ANA = { name: "Ana Ribeiro", country: "BR", contact: "ana@exemplo.org" };
const JOAO = { name: "João Alves", country: "PT", contact: "+351 912 345 678" };

const reset = () => {
  storage.clear();
  usePrayerStore.setState({ intercessors: [], hydrated: true });
};

const network = () => usePrayerStore.getState().intercessors;
const persisted = () => storage.getItem(KEY) ?? "";

describe("cadastrar na rede", () => {
  beforeEach(reset);

  it("guarda nome, país e contato", () => {
    expect(usePrayerStore.getState().addIntercessor(ANA, "i1")).toBe(true);
    expect(network()).toHaveLength(1);
    expect(network()[0]).toMatchObject({
      id: "i1",
      name: "Ana Ribeiro",
      country: "BR",
      contact: "ana@exemplo.org",
    });
  });

  it("recusa um cadastro sem canal de contato, sem gravar nada", () => {
    const refused = usePrayerStore
      .getState()
      .addIntercessor({ ...ANA, contact: "perguntar ao João" }, "i1");

    expect(refused).toBe(false);
    expect(network()).toEqual([]);
  });

  it("recusa um país que não está na lista", () => {
    expect(
      usePrayerStore.getState().addIntercessor({ ...ANA, country: "Brasil" }, "i1"),
    ).toBe(false);
    expect(network()).toEqual([]);
  });
});

describe("editar um cadastro", () => {
  beforeEach(() => {
    reset();
    usePrayerStore.getState().addIntercessor(ANA, "i1");
  });

  it("troca o contato mantendo a data de entrada na rede", () => {
    const before = network()[0].addedAt;
    const done = usePrayerStore
      .getState()
      .updateIntercessor("i1", { ...ANA, contact: "+55 11 98765-4321" });

    expect(done).toBe(true);
    expect(network()[0].contact).toBe("+55 11 98765-4321");
    expect(network()[0].addedAt).toBe(before);
  });

  it("mudar de país move a pessoa de grupo sem duplicá-la", () => {
    usePrayerStore.getState().updateIntercessor("i1", { ...ANA, country: "PT" });

    expect(network()).toHaveLength(1);
    expect(network()[0].country).toBe("PT");
  });

  it("uma edição inválida não corrompe o que já estava certo", () => {
    const done = usePrayerStore
      .getState()
      .updateIntercessor("i1", { ...ANA, contact: "" });

    expect(done).toBe(false);
    expect(network()[0].contact).toBe("ana@exemplo.org");
  });

  it("editar quem não existe não cria ninguém", () => {
    expect(usePrayerStore.getState().updateIntercessor("nope", ANA)).toBe(false);
    expect(network()).toHaveLength(1);
  });
});

describe("remover apaga o contato, não o esconde", () => {
  beforeEach(() => {
    reset();
    usePrayerStore.getState().addIntercessor(ANA, "i1");
    usePrayerStore.getState().addIntercessor(JOAO, "i2");
  });

  it("o contato some da rede em memória", () => {
    usePrayerStore.getState().removeIntercessor("i1");

    expect(network().map((person) => person.id)).toEqual(["i2"]);
    expect(JSON.stringify(network())).not.toContain("ana@exemplo.org");
  });

  it("e some também do que ficou gravado no navegador", () => {
    expect(persisted()).toContain("ana@exemplo.org");

    usePrayerStore.getState().removeIntercessor("i1");

    expect(persisted()).not.toContain("ana@exemplo.org");
    expect(persisted()).not.toContain("Ana Ribeiro");
    expect(persisted()).toContain("João Alves");
  });

  it("não sobra lápide nem marca de removido", () => {
    usePrayerStore.getState().removeIntercessor("i1");

    const stored = JSON.parse(persisted()) as {
      state: { intercessors: unknown[] };
    };
    expect(stored.state.intercessors).toHaveLength(1);
    expect(persisted()).not.toContain("removed");
    expect(persisted()).not.toContain("deleted");
  });

  it("remover quem não existe não mexe em ninguém", () => {
    usePrayerStore.getState().removeIntercessor("nope");
    expect(network()).toHaveLength(2);
  });
});
