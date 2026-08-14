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
const { LISTENING_FLOW, MEETING_STATE_SYMBOLS, RITMO_MEETINGS } = await import(
  "../../../../constants/meetings"
);
const { EMPTY_REGION_TEAM, REGIONS } = await import(
  "../../../../constants/regions"
);
const { resolveMeetingParticipants } = await import("../../../../utils/rhythm");
const { Cascade, ListeningFlow } = await import("../Cascade");
const { MeetingCard } = await import("../MeetingCard");
const { MeetingRow } = await import("../MeetingRow");

type Region = (typeof REGIONS)[number] & { team: typeof EMPTY_REGION_TEAM };

const noop = () => {};

const regionsWith = (holder: string): Region[] =>
  REGIONS.map((region) => ({
    ...region,
    team:
      region.key === "oceania"
        ? { ...EMPTY_REGION_TEAM, obtLab: holder }
        : { ...EMPTY_REGION_TEAM },
  }));

const meeting = RITMO_MEETINGS[0];
const scope = { key: "oceania" as const, labelKey: "continent_oceania", count: 36 };

const row = (
  overrides: Partial<Parameters<typeof MeetingRow>[0]> = {},
): string =>
  renderToStaticMarkup(
    createElement(MeetingRow, {
      scope,
      status: { state: "new", date: null },
      nextDue: "31 de mai. de 2026",
      periodLabel: "Maio · 2026",
      readiness: { ready: 0, total: 36 },
      participants: resolveMeetingParticipants(meeting, "oceania", []),
      onLog: noop,
      onUndo: noop,
      ...overrides,
    }),
  );

beforeEach(async () => {
  await i18n.changeLanguage("pt");
});

describe("a cascata abre a página como índice das reuniões", () => {
  it("lista as cinco, numeradas e com a cadência", () => {
    const markup = renderToStaticMarkup(
      createElement(Cascade, { meetings: RITMO_MEETINGS }),
    );

    expect(RITMO_MEETINGS).toHaveLength(5);
    for (const [index, item] of RITMO_MEETINGS.entries()) {
      expect(markup, item.id).toContain(i18n.t(item.titleKey));
      expect(markup, item.id).toContain(String(index + 1).padStart(2, "0"));
    }
    expect(markup).toContain(i18n.t("ritmo_monthly"));
    expect(markup).toContain(i18n.t("ritmo_quarterly"));
    expect(markup).toContain(i18n.t("ritmo_annual"));
  });
});

describe("a escuta que sobe e o cuidado que desce cabem numa imagem", () => {
  const markup = () =>
    renderToStaticMarkup(
      createElement(ListeningFlow, { tiers: LISTENING_FLOW }),
    );

  it("mostra os cinco degraus, do campo à governança", () => {
    const flow = markup();
    expect(LISTENING_FLOW).toHaveLength(5);
    for (const tier of LISTENING_FLOW) {
      expect(flow, tier.key).toContain(i18n.t(tier.levelKey));
      expect(flow, tier.key).toContain(i18n.t(tier.whatKey));
    }
  });

  it("diz que a informação sobe e o cuidado volta", () => {
    expect(markup()).toContain(i18n.t("ritmo_flow_note"));
  });

  it("nomeia os papéis pelo organograma, não por um vocabulário paralelo", () => {
    const flow = markup();
    expect(flow).toContain(i18n.t("role_obtlab"));
    expect(flow).toContain(i18n.t("role_coordinator"));
    expect(flow).toContain(i18n.t("role_resource"));
    expect(flow).not.toContain("undefined");
  });
});

describe("o cartão da reunião diz cadência, quem participa e o que a alimenta", () => {
  const markup = renderToStaticMarkup(
    createElement(MeetingCard, { meeting, children: null }),
  );

  it("traz título, cadência e descrição", () => {
    expect(markup).toContain(i18n.t(meeting.titleKey));
    expect(markup).toContain(i18n.t(meeting.descriptionKey));
    expect(markup).toContain(i18n.t("ritmo_monthly"));
  });

  it("traz o que alimenta a reunião", () => {
    expect(markup).toContain(i18n.t("ritmo_feeds"));
    expect(markup).toContain(i18n.t("ritmo_feed_pulso"));
  });

  it("traz os papéis que participam", () => {
    expect(markup).toContain(i18n.t("role_obtlab"));
    expect(markup).toContain(i18n.t("ritmo_role_teams"));
  });
});

describe("o estado da linha se lê sem cor", () => {
  it("cada estado carrega símbolo e texto, não só preenchimento", () => {
    for (const state of ["done", "pending", "overdue", "new"] as const) {
      const markup = row({
        status: { state, date: state === "new" ? null : "2026-04-20" },
      });
      expect(markup, state).toContain(MEETING_STATE_SYMBOLS[state]);
      expect(markup, state).toContain(i18n.t(`ritmo_st_${state}`));
    }
  });

  it("atrasada e a fazer não se distinguem só pelo selo", () => {
    expect(i18n.t("ritmo_st_overdue")).not.toBe(i18n.t("ritmo_st_pending"));
    expect(MEETING_STATE_SYMBOLS.overdue).not.toBe(
      MEETING_STATE_SYMBOLS.pending,
    );
  });

  it("sem registro nenhum, a última é um travessão e não uma data inventada", () => {
    const markup = row();
    expect(markup).toContain(i18n.t("ritmo_last"));
    expect(markup).toContain("—");
    expect(markup).not.toContain("Invalid");
  });
});

describe("a linha mostra o que a alimenta e para onde vai", () => {
  it("conta quantas equipes já reportaram no período", () => {
    const markup = row();
    expect(markup).toContain("0/36");
    expect(markup).toContain(i18n.t("ritmo_reported"));
    expect(markup).toContain(i18n.t("ritmo_readiness"));
  });

  it("pendente convida a registrar e diz até quando", () => {
    const markup = row();
    expect(markup).toContain(i18n.t("ritmo_next"));
    expect(markup).toContain("31 de mai. de 2026");
    expect(markup).toContain(i18n.t("ritmo_register"));
  });

  it("em dia diz o período que ficou coberto e oferece desfazer", () => {
    const markup = row({ status: { state: "done", date: "2026-05-04" } });
    expect(markup).toContain(i18n.t("ritmo_done_this"));
    expect(markup).toContain("Maio · 2026");
    expect(markup).toContain(i18n.t("ritmo_undo"));
    expect(markup).not.toContain(i18n.t("ritmo_register"));
  });

  it("uma região sem projetos não recebe contagem", () => {
    expect(row({ readiness: null })).not.toContain(i18n.t("ritmo_reported"));
  });
});

describe("quem participa chega por referência ao organograma", () => {
  it("o nome do titular aparece na linha da região", () => {
    const markup = row({
      participants: resolveMeetingParticipants(
        meeting,
        "oceania",
        regionsWith("Ana Ribeiro"),
      ),
    });
    expect(markup).toContain(i18n.t("ritmo_participants"));
    expect(markup).toContain("Ana Ribeiro");
  });

  it("trocar o nome no organograma troca o nome na linha", () => {
    expect(
      row({
        participants: resolveMeetingParticipants(
          meeting,
          "oceania",
          regionsWith("Marcos Pinho"),
        ),
      }),
    ).toContain("Marcos Pinho");
  });

  it("sem titular, a linha diz a definir em vez de ficar muda", () => {
    expect(row()).toContain(i18n.t("sb_no_coordinator"));
  });
});
