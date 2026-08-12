import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
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
  };
}

const storage = createMemoryStorage();
vi.stubGlobal("localStorage", storage);
vi.stubGlobal("window", { localStorage: storage });

const { default: i18n } = await import("../../../../i18n");
const { makeEmptyProject } = await import("../../../../stores/recordStore");
const {
  NEED_STATUS_SYMBOLS,
  NEED_URGENCY_SYMBOLS,
} = await import("../../../../constants/project");
const { makeNeed } = await import("../../../../utils/needs");
const { NecessidadesTab } = await import("../tabs/Necessidades");

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
    createElement(NecessidadesTab, { mode, draft: handle(values) }),
  );

const NEEDS = [
  {
    ...makeNeed(),
    category: "equipment" as const,
    urgency: "high" as const,
    status: "open" as const,
    description: "Gravador de áudio para a equipe do Alto Solimões.",
    estimatedValue: "R$ 4.200",
    deadline: "2026-09-30",
  },
  {
    ...makeNeed(),
    category: "training" as const,
    urgency: "medium" as const,
    status: "fulfilled" as const,
    description: "Oficina de checagem comunitária.",
    fulfilledBy: "Base regional",
    fulfilledDate: "2026-06-01",
  },
  {
    ...makeNeed(),
    category: "logistics" as const,
    urgency: "low" as const,
    status: "dropped" as const,
    description: "Aluguel de van para a viagem que foi cancelada.",
    droppedDate: "2026-05-02",
  },
];

beforeEach(async () => {
  await i18n.changeLanguage("pt");
});

describe("a copy pede ajuda, não relata falha", () => {
  it("a chamada da aba fala de pedido, não de deficiência", () => {
    for (const mode of ["ver", "editar"] as const) {
      expect(tab(mode), mode).toContain(i18n.t("needs_lead"));
    }
    expect(i18n.t("needs_lead")).toContain("pedido de ajuda");
  });

  it("o vazio orienta em vez de dizer que não há dado", () => {
    const markup = tab("ver");
    expect(markup).toContain(i18n.t("needs_empty"));
    expect(markup).not.toContain("Nenhum dado");
  });
});

describe("o ciclo de vida aparece na tela", () => {
  it("separa em aberto de já encerrados", () => {
    const markup = tab("ver", { needsItems: NEEDS });
    expect(markup).toContain(i18n.t("needs_open_section"));
    expect(markup).toContain(i18n.t("needs_closed_section"));
    expect(markup).toContain(i18n.t("needs_open_count", { count: 1 }));
  });

  it("o pedido encerrado continua na tela, fora da lista aberta", () => {
    const markup = tab("ver", { needsItems: NEEDS });
    expect(markup).toContain("Oficina de checagem comunitária.");
    expect(markup).toContain("Aluguel de van para a viagem que foi cancelada.");
    expect(markup).toContain("Base regional");
  });

  it("o formulário traz o campo de estado em cada pedido", () => {
    const markup = tab("editar", { needsItems: NEEDS });
    const fields = markup.match(/for="need-\d+-status"/gu) ?? [];
    expect(fields).toHaveLength(NEEDS.length);
    expect(markup).toContain(i18n.t("need_status_label"));
  });

  it("escolher não é mais necessário explica o que isso faz", () => {
    expect(tab("editar", { needsItems: [NEEDS[0]] })).not.toContain(
      i18n.t("need_status_dropped_hint"),
    );
    expect(tab("editar", { needsItems: [NEEDS[2]] })).toContain(
      i18n.t("need_status_dropped_hint"),
    );
  });

  it("descartar mostra a data em que deixou de ser necessário", () => {
    const markup = tab("ver", { needsItems: [NEEDS[2]] });
    expect(markup).toContain(i18n.t("need_dropped_date"));
    expect(markup).not.toContain(i18n.t("need_fulfilled_by"));
  });

  it("o plural de encerrados concorda em português", () => {
    const two = tab("ver", { needsItems: [NEEDS[1], NEEDS[2]] });
    expect(two).toContain(i18n.t("needs_closed_count", { count: 2 }));
    expect(two).toContain("2 encerrados");

    const one = tab("ver", { needsItems: [NEEDS[1]] });
    expect(one).toContain("1 encerrado");
    expect(one).not.toContain("1 encerrados");
  });
});

describe("urgência e estado se leem sem cor", () => {
  it("cada pedido carrega símbolo e rótulo", () => {
    const markup = tab("ver", { needsItems: NEEDS });
    expect(markup).toContain(NEED_URGENCY_SYMBOLS.high);
    expect(markup).toContain(NEED_STATUS_SYMBOLS.open);
    expect(markup).toContain(NEED_STATUS_SYMBOLS.fulfilled);
    expect(markup).toContain(NEED_STATUS_SYMBOLS.dropped);
    expect(markup).toContain(i18n.t("need_urgency_high"));
    expect(markup).toContain(i18n.t("need_status_fulfilled"));
  });

  it("a urgência é dita como urgência, não como saúde", () => {
    const markup = tab("editar", { needsItems: [NEEDS[0]] });
    expect(markup).toContain(i18n.t("need_urgency_hint"));
    expect(markup).not.toContain(i18n.t("health_critical"));
  });
});

describe("o pedido guarda o que a região precisa para agir", () => {
  it("categoria, valor e prazo aparecem no modo ver", () => {
    const markup = tab("ver", { needsItems: [NEEDS[0]] });
    expect(markup).toContain(i18n.t("need_cat_equipment"));
    expect(markup).toContain("R$ 4.200");
    expect(markup).toContain("Gravador de áudio para a equipe do Alto Solimões.");
    expect(markup).not.toContain("undefined");
  });

  it("quem atendeu só é pedido quando o pedido foi atendido", () => {
    const open = tab("editar", { needsItems: [NEEDS[0]] });
    const done = tab("editar", { needsItems: [NEEDS[1]] });
    expect(open).not.toContain(i18n.t("need_fulfilled_by"));
    expect(done).toContain(i18n.t("need_fulfilled_by"));
  });

  it("as observações gerais continuam disponíveis", () => {
    const markup = tab("ver", {
      needsItems: NEEDS,
      needsNotes: "A base assumiu metade do custo.",
    });
    expect(markup).toContain("A base assumiu metade do custo.");
  });
});
