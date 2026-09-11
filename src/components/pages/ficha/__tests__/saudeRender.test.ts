import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type {
  OverallHealth,
  Project,
  ProjectDerived,
} from "../../../../types/project";

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
const { HEALTH_DIMENSIONS } = await import("../../../../constants/health");
const { HEALTH_SYMBOLS } = await import("../../../../constants/status");
const { SaudeTab } = await import("../tabs/Saude");

const noop = () => {};

type Values = Partial<ReturnType<typeof makeEmptyProject>>;

/** The server's nine, of which this tab reads exactly one: `health`. */
const serverDerived = (health: OverallHealth): ProjectDerived => ({
  status: "em-andamento",
  health,
  stale: null,
  progress: 0,
  priority: "default",
  healthScore: 0,
  daysSinceUpdate: null,
  lastProgressUpdate: null,
  region: "other",
});

const handle = (values: Values = {}, health: OverallHealth | null = null) => ({
  values: { ...makeEmptyProject(), ...values },
  saved:
    health === null
      ? undefined
      : ({
          ...makeEmptyProject(),
          ...values,
          id: "p1",
          derived: serverDerived(health),
        } as Project),
  isNew: false,
  hasChanges: false,
  missing: [],
  set: noop,
  update: noop,
  errors: [],
  errorsFor: () => [],
  discard: noop,
});

const tab = (
  mode: "ver" | "editar",
  values: Values = {},
  health: OverallHealth | null = null,
) =>
  renderToStaticMarkup(
    createElement(SaudeTab, { mode, draft: handle(values, health) }),
  );

const ASSESSED: Values = {
  healthEmotional: "atencao",
  healthRelational: "boa",
  healthSpiritual: "boa",
  healthPhysical: "",
  healthAssessmentDate: "2026-05-14",
  healthAssessor: "Coordenação regional",
  healthNotes: "A equipe pediu uma pausa depois da checagem.",
};

beforeEach(async () => {
  await i18n.changeLanguage("pt");
});

describe("as quatro dimensões aparecem nos dois modos", () => {
  it("cada dimensão traz o rótulo em ver e a pergunta em editar", () => {
    const view = tab("ver", ASSESSED);
    const form = tab("editar", ASSESSED);

    for (const dimension of HEALTH_DIMENSIONS) {
      expect(view, dimension.key).toContain(i18n.t(dimension.labelKey));
      expect(form, dimension.key).toContain(i18n.t(dimension.questionKey));
    }
  });

  it("as três notas mais o não avaliado são escolhas visíveis no formulário", () => {
    const form = tab("editar", ASSESSED);
    for (const label of [
      i18n.t("health_good"),
      i18n.t("health_attention"),
      i18n.t("health_critical"),
      i18n.t("health_not_assessed"),
    ]) {
      expect(form).toContain(label);
    }
    expect(form).not.toContain("undefined");
  });
});

describe("a nota se lê sem cor", () => {
  it("cada dimensão carrega símbolo e texto, não só cor", () => {
    const markup = tab("ver", ASSESSED);
    expect(markup).toContain(HEALTH_SYMBOLS.atencao);
    expect(markup).toContain(HEALTH_SYMBOLS.boa);
    expect(markup).toContain(HEALTH_SYMBOLS.na);
    expect(markup).toContain(i18n.t("health_attention"));
    expect(markup).toContain("sr-only");
  });

  it("não avaliado se distingue de boa por texto, não por ausência", () => {
    const markup = tab("ver", ASSESSED);
    expect(markup).toContain(i18n.t("health_not_assessed"));
    expect(markup).toContain(i18n.t("health_good"));
    expect(i18n.t("health_not_assessed")).not.toBe(i18n.t("health_good"));
  });
});

describe("a copy fala de cuidado, não de nota", () => {
  it("crítica chama para cuidar", () => {
    const markup = tab(
      "ver",
      { ...ASSESSED, healthEmotional: "critica" },
      "critica",
    );
    expect(markup).toContain(i18n.t("health_care_critical"));
  });

  it("atenção sugere conversa antes da próxima avaliação", () => {
    expect(tab("ver", ASSESSED, "atencao")).toContain(
      i18n.t("health_care_attention"),
    );
  });

  it("boa não recebe recado nenhum", () => {
    const markup = tab(
      "ver",
      {
        healthEmotional: "boa",
        healthRelational: "boa",
        healthSpiritual: "boa",
        healthPhysical: "boa",
      },
      "boa",
    );
    expect(markup).not.toContain(i18n.t("health_care_critical"));
    expect(markup).not.toContain(i18n.t("health_care_attention"));
  });

  it("nunca avaliada diz que não foi escutada, não que está bem", () => {
    const markup = tab("ver", {}, "na");
    expect(markup).toContain(i18n.t("health_never_assessed"));
    expect(markup).not.toContain(i18n.t("health_care_critical"));
  });

  it("o recado é a leitura do servidor, não uma conta local das quatro notas", () => {
    // As quatro notas dizem crítica; o servidor diz boa. Se a ficha ainda calculasse,
    // o recado de cuidado apareceria — é essa divergência que a INT-03 remove.
    const markup = tab(
      "ver",
      {
        healthEmotional: "critica",
        healthRelational: "critica",
        healthSpiritual: "critica",
        healthPhysical: "critica",
      },
      "boa",
    );
    expect(markup).not.toContain(i18n.t("health_care_critical"));
    expect(markup).not.toContain(i18n.t("health_never_assessed"));
  });

  it("sem bloco derived a ficha não inventa leitura nenhuma", () => {
    const markup = tab("ver", { ...ASSESSED, healthEmotional: "critica" });
    expect(markup).not.toContain(i18n.t("health_care_critical"));
    expect(markup).not.toContain(i18n.t("health_never_assessed"));
  });
});

describe("o consentimento é escolha explícita no formulário", () => {
  it("as duas visibilidades aparecem com o que cada uma faz", () => {
    const form = tab("editar", { prayerRequests: "Orem pela equipe." });
    expect(form).toContain(i18n.t("prayer_vis_coordination"));
    expect(form).toContain(i18n.t("prayer_vis_network"));
    expect(form).toContain(i18n.t("prayer_vis_coordination_hint"));
    expect(form).toContain(i18n.t("prayer_vis_network_hint"));
    expect(form).toContain(i18n.t("prayer_vis_default_note"));
  });

  it("sem escolha, a opção marcada é só a coordenação", () => {
    const form = tab("editar", { prayerRequests: "Orem pela equipe." });
    const radios = (form.match(/<input[^>]*type="radio"[^>]*>/gu) ?? []).filter(
      (radio) => radio.includes('name="prayer-visibility"'),
    );
    const marked = radios.filter((radio) => radio.includes("checked"));

    expect(radios).toHaveLength(2);
    expect(marked).toHaveLength(1);
    expect(marked[0]).toContain('value="coordenacao"');
  });

  it("o modo ver diz a quem o pedido chega", () => {
    const withheld = tab("ver", { prayerRequests: "Orem pela equipe." });
    expect(withheld).toContain(i18n.t("prayer_vis_coordination"));

    const shared = tab("ver", {
      prayerRequests: "Orem pela equipe.",
      prayerVisibility: "rede",
    });
    expect(shared).toContain(i18n.t("prayer_vis_network"));
  });
});

describe("a intervenção pastoral se vê sem abrir nada", () => {
  it("aparece no modo ver com quem vai fazer", () => {
    const markup = tab("ver", {
      ...ASSESSED,
      needsPastoralIntervention: "sim",
      pastoralInterventionName: "Pastor da base",
    });
    expect(markup).toContain(i18n.t("d_pastoral"));
    expect(markup).toContain("Pastor da base");
  });

  it("a pergunta está no formulário sem sub-painel", () => {
    expect(tab("editar", ASSESSED)).toContain(i18n.t("f_pastoral"));
  });

  it("não pedida, não ocupa espaço no modo ver", () => {
    expect(tab("ver", ASSESSED)).not.toContain(i18n.t("d_pastoral"));
  });
});

describe("o histórico aparece junto do estado atual", () => {
  it("sem histórico, diz que é a primeira conversa", () => {
    expect(tab("ver", ASSESSED)).toContain(i18n.t("d_health_history_empty"));
  });

  it("com histórico, lista as conversas anteriores", () => {
    const markup = tab("ver", {
      ...ASSESSED,
      healthHistory: [
        {
          date: "2025-11-02",
          assessor: "Mentor antigo",
          emotional: "critica",
          relational: "boa",
          spiritual: "boa",
          physical: "boa",
          notes: "",
        },
        {
          date: "2026-05-14",
          assessor: "Coordenação regional",
          emotional: "atencao",
          relational: "boa",
          spiritual: "boa",
          physical: "",
          notes: "",
        },
      ],
    });

    expect(markup).toContain(i18n.t("d_health_history"));
    expect(markup).toContain("Mentor antigo");
    expect(markup).not.toContain(i18n.t("d_health_history_empty"));
  });

  it("uma entrada da BE-07 mostra quem filiou, além de quem avaliou", () => {
    const markup = tab("ver", {
      ...ASSESSED,
      healthHistory: [
        {
          date: "2026-05-14",
          assessor: "Mentor de campo",
          author: "Coordenadora Regional",
          emotional: "boa",
          relational: "boa",
          spiritual: "boa",
          physical: "boa",
          notes: "",
          questionSetVersion: 1,
          overall: "boa",
        },
      ],
    });

    expect(markup).toContain("Mentor de campo");
    expect(markup).toContain("Coordenadora Regional");
  });

  it("uma entrada sem versão de perguntas diz que respondeu a nenhum questionário", () => {
    const markup = tab("ver", {
      ...ASSESSED,
      healthHistory: [
        {
          date: "2025-01-10",
          assessor: "",
          emotional: "boa",
          relational: "boa",
          spiritual: "boa",
          physical: "boa",
          notes: "",
          questionSetVersion: null,
        },
      ],
    });

    expect(markup).toContain(i18n.t("d_health_version_none"));
  });

  it("uma entrada sem overall recebe uma leitura calculada, nunca undefined", () => {
    const markup = tab("ver", {
      ...ASSESSED,
      healthHistory: [
        {
          date: "2025-01-10",
          assessor: "Mentor antigo",
          emotional: "critica",
          relational: "boa",
          spiritual: "boa",
          physical: "boa",
          notes: "",
        },
      ],
    });

    expect(markup).toContain(i18n.t("health_critical"));
    expect(markup).not.toContain("undefined");
  });
});
