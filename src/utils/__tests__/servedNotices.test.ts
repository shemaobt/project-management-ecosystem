import { beforeEach, describe, expect, it, vi } from "vitest";
import type {
  ProjectNotificationKind,
  ServedNoticeFacts,
  ServedNotification,
} from "../../types/notification";

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

const { default: i18n } = await import("../../i18n");
const { servedNoticeSummary } = await import("../notifications");

const KINDS: ProjectNotificationKind[] = ["health", "need", "field", "prayer", "stale"];

const facts = (over: Partial<ServedNoticeFacts> = {}): ServedNoticeFacts => ({
  languageName: "Tikuna",
  region: "south-america",
  assessedOn: null,
  needCount: null,
  needCategories: [],
  needTotals: [],
  submittedBy: null,
  daysSinceUpdate: null,
  place: null,
  ...over,
});

const served = (
  kind: ProjectNotificationKind,
  over: Partial<ServedNoticeFacts> | null = {},
): ServedNotification => ({
  origin: "server",
  id: "n-1",
  kind,
  urgent: false,
  projectId: null,
  date: "2026-10-02",
  facts: over === null ? null : facts(over),
});

const say = (entry: ServedNotification) => servedNoticeSummary(entry, i18n.t);

beforeEach(async () => {
  await i18n.changeLanguage("pt");
});

describe("a frase de um aviso servido sai na língua de quem lê (OBT-559)", () => {
  it("a saúde diz quem e o dia, em português e em inglês", async () => {
    const entry = served("health", { assessedOn: "2026-09-11" });

    const pt = say(entry);
    expect(pt).toContain("Tikuna: a avaliação de saúde ficou crítica em");
    expect(pt).toContain("2026");
    expect(pt).not.toContain("2026-09-11");

    await i18n.changeLanguage("en");
    const en = say(entry);
    expect(en).toContain("Tikuna was assessed as critical on");
    expect(en).not.toContain("avaliação");
  });

  it("o Pulso diz quem enviou e de qual projeto, e um líder de equipe quando ninguém assinou", async () => {
    expect(say(served("field", { submittedBy: "Kuaray" }))).toBe(
      "Kuaray enviou o Pulso mensal de Tikuna. Abra o projeto para revisá-lo.",
    );
    expect(say(served("field"))).toContain("Um líder de equipe enviou o Pulso mensal de Tikuna.");

    await i18n.changeLanguage("en");
    expect(say(served("field", { submittedBy: "Kuaray" }))).toBe(
      "Kuaray submitted the monthly Pulse for Tikuna. Open the project to review it.",
    );
  });

  it("o pedido de oração diz o projeto e nunca o texto do pedido", async () => {
    expect(say(served("prayer"))).toBe(
      "O Pulso recebido de Tikuna traz um pedido de oração que a equipe compartilhou com a rede. Abra o projeto para lê-lo.",
    );

    await i18n.changeLanguage("en");
    expect(say(served("prayer"))).toContain("The Pulse received for Tikuna carries a prayer request");
  });

  it("o projeto quieto conta os dias no singular e no plural, e diz 'há algum tempo' sem eles", async () => {
    expect(say(served("stale", { daysSinceUpdate: 1 }))).toContain("há 1 dia.");
    expect(say(served("stale", { daysSinceUpdate: 400 }))).toContain("há 400 dias.");
    expect(say(served("stale"))).toContain("Tikuna está sem atualização de progresso há algum tempo.");

    await i18n.changeLanguage("en");
    expect(say(served("stale", { daysSinceUpdate: 400 }))).toContain("for 400 days.");
    expect(say(served("stale"))).toContain("in a while.");
  });

  it("um nome que o servidor recolheu vira 'um projeto', no começo e no meio da frase", async () => {
    expect(say(served("health", { languageName: "", assessedOn: "2026-09-11" }))).toMatch(
      /^Um projeto: a avaliação/,
    );
    expect(say(served("prayer", { languageName: "" }))).toContain("O Pulso recebido de um projeto");

    await i18n.changeLanguage("en");
    expect(say(served("stale", { languageName: "" }))).toMatch(/^A project has had/);
    expect(say(served("field", { languageName: "" }))).toContain("for a project.");
  });
});

describe("a necessidade urgente: o local só para quem o servidor deixou ler", () => {
  const needs = { needCount: 2, needCategories: ["financial", "security"] };

  it("com o local liberado, a frase diz onde; com ele recolhido, diz a região, nunca a chave", () => {
    const open = say(
      served("need", { ...needs, place: { location: "Vila Exemplo", locationWithheld: false } }),
    );
    expect(open).toContain("Tikuna (Vila Exemplo) registrou 2 necessidades urgentes:");

    const withheld = say(
      served("need", { ...needs, place: { location: "south-america", locationWithheld: true } }),
    );
    expect(withheld).toContain(`Tikuna (${i18n.t("continent_south_america")}) registrou`);
    expect(withheld).not.toContain("south-america");
  });

  it("quem não alcança o projeto não recebe o local e lê a região; sem região, só o nome", () => {
    expect(say(served("need", needs))).toContain(
      `Tikuna (${i18n.t("continent_south_america")}) registrou`,
    );
    expect(say(served("need", { ...needs, region: null }))).toMatch(/^Tikuna registrou 2/);
  });

  it("as categorias saem no catálogo, e uma que ele não conhece sai como veio", () => {
    const line = say(served("need", { needCount: 2, needCategories: ["security", "a-new-one"] }));

    expect(line).toContain(i18n.t("need_cat_security"));
    expect(line).toContain("a-new-one");
  });

  it("uma necessidade é singular; os valores saem por moeda, no formato da língua", async () => {
    const one = served("need", {
      needCount: 1,
      needCategories: ["financial"],
      needTotals: [{ amount: "5000.00", currency: "BRL" }],
    });
    const two = served("need", {
      ...needs,
      needTotals: [
        { amount: "5000.00", currency: "BRL" },
        { amount: "40.00", currency: "USD" },
      ],
    });

    expect(say(one)).toContain("registrou uma necessidade urgente:");
    expect(say(two)).toContain("Estimativa:");
    expect(say(two)).toContain("5.000,00");
    expect(say(two)).toContain("40,00");

    await i18n.changeLanguage("en");
    expect(say(one)).toContain("raised an urgent need:");
    expect(say(two)).toContain("raised 2 urgent needs:");
    expect(say(two)).toContain("Estimated at");
    expect(say(two)).toContain("5,000.00");
  });
});

describe("um aviso de antes dos fatos diz o tipo e nada do que dizia", () => {
  it("cada tipo tem a sua linha genérica, nas duas línguas", async () => {
    const pt = KINDS.map((kind) => say(served(kind, null)));
    expect(new Set(pt).size).toBe(KINDS.length);
    expect(pt.every((line) => line !== "" && !line.includes("{{"))).toBe(true);

    await i18n.changeLanguage("en");
    const en = KINDS.map((kind) => say(served(kind, null)));
    expect(en.every((line, index) => line !== pt[index])).toBe(true);
  });

  it("uma saúde sem o dia cai na mesma linha genérica, em vez de uma frase pela metade", () => {
    expect(say(served("health"))).toBe(i18n.t("notif_served_old_health"));
  });
});
