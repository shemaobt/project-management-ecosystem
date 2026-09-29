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
const {
  BRIDGE_PEOPLE,
  LISTENING_FLOW,
  MEETING_STATE_SYMBOLS,
  RITMO_ENCOUNTERS,
  RITMO_MEETINGS,
} = await import("../../../../constants/meetings");
const { MemoryRouter } = await import("react-router-dom");
const { EMPTY_REGION_TEAM, REGIONS } = await import(
  "../../../../constants/regions"
);
const { resolveMeetingParticipants } = await import("../../../../utils/rhythm");
const { Cascade, ListeningFlow } = await import("../Cascade");
const { MeetingCard } = await import("../MeetingCard");
const { MeetingRow } = await import("../MeetingRow");
const { CelebrationCard, PulseCard } = await import("../EncounterCards");
const { LogUnread } = await import("../LogUnread");
const { withinReach } = await import("../reach");

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

const byId = (id: (typeof RITMO_MEETINGS)[number]["id"]) => {
  const found = RITMO_MEETINGS.find((item) => item.id === id);
  if (!found) throw new Error(id);
  return found;
};

/** The quarterly is the one whose attendees are org-chart roles, so it carries a holder. */
const meeting = byId("trimestral_pi_pontes");
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

/**
 * GATE-02 (OBT-388, Karina, 22/set/2026): cinco encontros, dos quais só três são reuniões. Os
 * ids e as cadências das três são os que o `shema-api` aceita (BE-10); uma grafia diferente
 * deixaria o cartão pendente para sempre, sem erro.
 */
describe("o conjunto do GATE-02", () => {
  it("são três reuniões, com os ids e as cadências do servidor", () => {
    expect(RITMO_MEETINGS.map((item) => [item.id, item.cadence])).toEqual([
      ["bimestral_pi_campo", "bimonthly"],
      ["trimestral_pi_pontes", "quarterly"],
      ["semestral_member_care", "semiannual"],
    ]);
    expect(RITMO_MEETINGS.every((item) => item.scope === "region")).toBe(true);
  });

  it("o Pulso e a Celebração entram na cascata, e não no log de reuniões", () => {
    expect(RITMO_ENCOUNTERS.map((item) => [item.key, item.kind])).toEqual([
      ["pulso_mensal", "form"],
      ["bimestral_pi_campo", "meeting"],
      ["trimestral_pi_pontes", "meeting"],
      ["semestral_member_care", "meeting"],
      ["celebracao_anual", "report"],
    ]);
  });

  it("as chaves da onda 1 que o GATE-02 aposentou saíram dos dois catálogos", () => {
    for (const lang of ["pt", "en"]) {
      for (const key of ["ritmo_m4_title", "ritmo_m6_title", "ritmo_m7_title"]) {
        expect(i18n.exists(key, { lng: lang }), `${lang}:${key}`).toBe(false);
      }
    }
  });
});

/**
 * `ritmo_role_leadership` é também o nome do corpo de liderança na Equipe (`constants/team.ts`).
 * O time de Projetos Internacionais tem chave própria, ou a Equipe passaria a ter dois corpos
 * com o mesmo nome (revisão da PR #62).
 */
describe("o time de Projetos Internacionais não empresta o nome da liderança da Equipe", () => {
  it("as duas chaves dizem coisas diferentes, nas duas línguas", () => {
    for (const lng of ["pt", "en"]) {
      expect(i18n.t("ritmo_role_international_projects", { lng }), lng).not.toBe(
        i18n.t("ritmo_role_leadership", { lng }),
      );
    }
  });
});

describe("a cascata abre a página como índice dos encontros", () => {
  const markup = () =>
    renderToStaticMarkup(createElement(Cascade, { encounters: RITMO_ENCOUNTERS }));

  it("lista os cinco, numerados e com a cadência", () => {
    const cascade = markup();
    for (const [index, item] of RITMO_ENCOUNTERS.entries()) {
      expect(cascade, item.key).toContain(i18n.t(item.titleKey));
      expect(cascade, item.key).toContain(String(index + 1).padStart(2, "0"));
    }
    for (const cadence of ["monthly", "bimonthly", "quarterly", "semiannual", "annual"]) {
      expect(cascade, cadence).toContain(i18n.t(`ritmo_${cadence}`));
    }
  });

  it("diz quais dois não são reunião, para o índice não prometer cinco cartões", () => {
    const cascade = markup();
    expect(cascade).toContain(i18n.t("ritmo_kind_form"));
    expect(cascade).toContain(i18n.t("ritmo_kind_report"));
  });
});

describe("a escuta que sobe e o cuidado que desce cabem numa imagem", () => {
  const markup = () =>
    renderToStaticMarkup(
      createElement(ListeningFlow, { tiers: LISTENING_FLOW }),
    );

  it("mostra os cinco degraus, do Pulso à Celebração", () => {
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
    expect(markup).toContain(i18n.t("ritmo_quarterly"));
  });

  it("traz o que alimenta a reunião", () => {
    expect(markup).toContain(i18n.t("ritmo_feeds"));
    expect(markup).toContain(i18n.t("ritmo_feed_trends"));
  });

  it("traz os papéis que participam", () => {
    expect(markup).toContain(i18n.t("role_obtlab"));
    expect(markup).toContain(i18n.t("ritmo_role_international_projects"));
  });

  /**
   * Karina, 28/set/2026: a Avaliação de Saúde fica na bimestral (confirmado), e as pessoas-ponte
   * ainda não existem como informação. Só a trimestral carrega o aviso, e ele diz isso — não que
   * a leitura é provisória.
   */
  it("só a trimestral avisa que as pessoas-ponte ainda não foram definidas", () => {
    const withNotice = RITMO_MEETINGS.filter((item) =>
      renderToStaticMarkup(
        createElement(MeetingCard, { meeting: item, children: null }),
      ).includes(i18n.t("ritmo_participants_pending")),
    ).map((item) => item.id);

    expect(withNotice).toEqual(["trimestral_pi_pontes"]);
    expect(i18n.t("ritmo_participants_pending")).toContain("pessoas-ponte");
  });

  it("a bimestral é alimentada pela Avaliação de Saúde, sem aviso de leitura provisória", () => {
    expect(byId("bimestral_pi_campo").readiness).toBe("health");
    expect(byId("bimestral_pi_campo").participantsPending).toBeFalsy();
  });

  it("o cartão e o fluxo da escuta leem as pessoas-ponte do mesmo lugar", () => {
    const tier = LISTENING_FLOW.find((item) => item.key === "trimestral_pi_pontes");

    expect(byId("trimestral_pi_pontes").roles).toEqual([
      "internationalProjects",
      ...BRIDGE_PEOPLE.roles,
    ]);
    expect(tier?.attendees).toEqual(byId("trimestral_pi_pontes").roles);
    expect(byId("trimestral_pi_pontes").participantsPending).toBe(!BRIDGE_PEOPLE.defined);
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

describe("o que não é reunião não se registra como reunião", () => {
  const pulse = (rows: Parameters<typeof PulseCard>[0]["rows"], read = true) =>
    renderToStaticMarkup(
      createElement(MemoryRouter, null, createElement(PulseCard, { rows, read })),
    );

  it("o Pulso Mensal conta quem devolveu por região, e não oferece registrar", () => {
    const markup = pulse([{ scope, readiness: { ready: 3, total: 36 } }]);
    expect(markup).toContain(i18n.t("ritmo_pulso_title"));
    expect(markup).toContain("3/36");
    expect(markup).toContain(i18n.t("ritmo_reported"));
    expect(markup).not.toContain(i18n.t("ritmo_register"));
  });

  /**
   * Um arquivo não lido não é um arquivo vazio: `0/36` diria *ninguém devolveu* quando a
   * verdade é *ainda não sabemos* (revisão da PR #62).
   */
  it("sem os Pulsos lidos, não mostra contagem nenhuma e diz por quê", () => {
    const markup = pulse([{ scope, readiness: { ready: 0, total: 36 } }], false);
    expect(markup).not.toContain("0/36");
    expect(markup).toContain(i18n.t("ritmo_pulso_unread"));
  });

  it("e aponta para Formulários, onde está quem falta projeto a projeto", () => {
    const markup = pulse([]);
    expect(markup).toContain('href="/formularios"');
    expect(markup).toContain(i18n.t("ritmo_pulso_where"));
  });

  it("a Celebração anual diz que é relatório, sem botão de registrar", () => {
    const markup = renderToStaticMarkup(
      createElement(MemoryRouter, null, createElement(CelebrationCard)),
    );
    expect(markup).toContain(i18n.t("ritmo_celebracao_title"));
    expect(markup).toContain(i18n.t("ritmo_celebracao_desc"));
    expect(markup).not.toContain("<button");
  });

  it("e leva ao relatório do ano (FE-50)", () => {
    const markup = renderToStaticMarkup(
      createElement(MemoryRouter, null, createElement(CelebrationCard)),
    );
    expect(markup).toContain('href="/ritmo/relatorio"');
    expect(markup).toContain(i18n.t("ritmo_celebracao_open"));
  });
});

/**
 * INT-07 (OBT-412): o log é do servidor. Enquanto ele não foi lido, nenhuma linha diz o estado
 * da reunião — sem log, todas diriam *a iniciar*, que é *nunca aconteceu* quando a verdade é
 * *não sabemos*. E o 403 do Círculo de Recursos não é falha: é o log que não é do papel dele.
 */
describe("o log das reuniões vem do servidor, e a tela diz quando não o tem", () => {
  const unread = (reading: "forbidden" | "loading" | "failed") =>
    renderToStaticMarkup(createElement(LogUnread, { reading, onRetry: noop }));

  it("sem acesso, nomeia de quem é o log pelos rótulos do organograma, sem oferecer tentar de novo", () => {
    const html = unread("forbidden");

    expect(html).toContain(i18n.t("equipe_global"));
    expect(html).toContain(i18n.t("role_coordinator"));
    expect(html).toContain(i18n.t("role_obtlab"));
    expect(html).not.toContain(i18n.t("net_retry"));
  });

  it("uma leitura que falhou diz que o estado é desconhecido e oferece tentar de novo", () => {
    const html = unread("failed");

    expect(html).toContain(i18n.t("ritmo_log_unread"));
    expect(html).toContain(i18n.t("net_retry"));
  });

  it("enquanto lê, diz que está lendo e não oferece nada", () => {
    const html = unread("loading");

    expect(html).toContain(i18n.t("ritmo_log_loading"));
    expect(html).not.toContain(i18n.t("net_retry"));
  });

  it("sem linhas, o cartão da reunião fica só com a cabeça — nenhum estado inventado", () => {
    const html = renderToStaticMarkup(createElement(MeetingCard, { meeting }));

    expect(html).toContain(i18n.t(meeting.titleKey));
    for (const state of ["done", "pending", "overdue", "new"] as const) {
      expect(html).not.toContain(MEETING_STATE_SYMBOLS[state]);
    }
    expect(html).not.toContain(i18n.t("ritmo_register"));
  });
});

describe("nenhuma reunião de fora da região de quem lê", () => {
  const scopes = [
    { key: "oceania" as const, labelKey: "continent_oceania", count: 36 },
    { key: "africa" as const, labelKey: "continent_africa", count: 12 },
    { key: "global" as const, labelKey: "ritmo_all_ecosystem", count: 48 },
  ];

  it("um papel regional vê só a própria região", () => {
    expect(withinReach(scopes, (key) => key === "africa").map((s) => s.key)).toEqual([
      "africa",
    ]);
  });

  it("nem o papel global recebe uma linha global, que o servidor recusaria", () => {
    expect(withinReach(scopes, () => true).map((s) => s.key)).toEqual([
      "oceania",
      "africa",
    ]);
  });

  it("sem regiões lidas ainda, não há linha nenhuma", () => {
    expect(withinReach(scopes, () => false)).toEqual([]);
  });
});
