import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AccountGrants } from "../../../../types/access";
import type { ApiFailure } from "../../../../types/session";

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
const { PersonPanel } = await import("../PersonPanel");
const {
  NOBODY_SEARCHED,
  awayNotice,
  cardOf,
  createPersonStore,
  personReducer,
} = await import("../personState");
type PersonState = import("../personState").PersonState;
type PersonEvent = import("../personState").PersonEvent;

beforeEach(async () => {
  await i18n.changeLanguage("pt");
});

const A: AccountGrants = {
  userId: "u-a",
  email: "pessoa-a@exemplo.org",
  displayName: "Pessoa A",
  isActive: true,
  apps: [],
  regions: [],
  regionScope: [],
};

const B: AccountGrants = {
  userId: "u-b",
  email: "pessoa-b@exemplo.org",
  displayName: "Pessoa B",
  isActive: true,
  apps: [{ appKey: "shema", roles: ["obtLab"] }],
  regions: [{ regionKey: "europe", grantedBy: null, grantedAt: "2026-10-28T10:00:00Z" }],
  regionScope: ["europe"],
};

const A_WITH_INTERCESSOR: AccountGrants = {
  ...A,
  apps: [{ appKey: "shema", roles: ["resourceCircle"] }],
  regions: [{ regionKey: "oceania", grantedBy: "u-admin", grantedAt: "2026-10-28T10:01:00Z" }],
  regionScope: ["oceania"],
};

const ROW = "shema:resourceCircle";

const REFUSED: ApiFailure = {
  kind: "conflict",
  status: 409,
  detail: "mesa and gestor are mutually exclusive",
  code: null,
};

const replay = (events: PersonEvent[], from: PersonState = NOBODY_SEARCHED) =>
  events.reduce(personReducer, from);

const found = (ticket: number, account: AccountGrants): PersonEvent => ({
  type: "answered",
  ticket,
  lookup: { kind: "found", account },
});

const searched = (ticket: number, account: AccountGrants): PersonEvent[] => [
  { type: "search", ticket, email: account.email },
  found(ticket, account),
];

const grantingA: PersonEvent[] = [
  ...searched(1, A),
  { type: "write", ticket: 2, target: A, row: ROW },
];

const noop = () => undefined;

function panelOf(state: PersonState): string {
  const card = cardOf(state);
  if (!card) throw new Error("nenhum cartão na tela");
  return renderToStaticMarkup(
    createElement(PersonPanel, {
      ...card,
      onGrant: noop,
      onRevoke: noop,
      onEditRegions: noop,
      onRegionsChange: noop,
      onSubmitRegions: noop,
      onCancelRegions: noop,
    }),
  );
}

describe("a gravação é da pessoa na tela (OBT-653)", () => {
  it("conceder para A, buscar B, a resposta de A chegar: o cartão segue B e o resultado de A não aparece nele", () => {
    const state = replay([
      ...grantingA,
      ...searched(3, B),
      { type: "written", ticket: 2, account: A_WITH_INTERCESSOR },
    ]);

    expect(cardOf(state)?.account).toBe(B);
    expect(cardOf(state)?.acting).toBeNull();
    expect(state.writes).toEqual([]);
    expect(panelOf(state)).toContain("Pessoa B");
    expect(panelOf(state)).not.toContain("Pessoa A");
  });

  it("a resposta de A com a busca de B ainda no ar não tira a busca do lugar: o Buscar segue desligado e B chega", () => {
    const during = replay([
      ...grantingA,
      { type: "search", ticket: 3, email: B.email },
      { type: "written", ticket: 2, account: A_WITH_INTERCESSOR },
    ]);
    expect(during.lookup).toEqual({ kind: "searching", email: B.email });

    expect(cardOf(personReducer(during, found(3, B)))?.account).toBe(B);
  });

  it("buscar B com a gravação de A no ar mostra B sem Gravando… e sem trava", () => {
    const state = replay([...grantingA, ...searched(3, B)]);
    const panel = panelOf(state);

    expect(cardOf(state)?.acting).toBeNull();
    expect(panel).not.toContain(i18n.t("acesso_saving"));
    expect(panel).not.toMatch(/<button[^>]*disabled=""/u);
    expect(panel).toContain(i18n.t("acesso_edit_regions"));
  });

  it("o Gravando… de A, no cartão de A, trava os botões dele", () => {
    const panel = panelOf(replay(grantingA));
    expect(panel).toContain(i18n.t("acesso_saving"));
    expect(panel).toMatch(/<button[^>]*disabled=""/u);
  });

  it("a recusa da gravação de A não cai numa linha do cartão de B", () => {
    const state = replay([
      ...grantingA,
      ...searched(3, B),
      { type: "refused", ticket: 2, failure: REFUSED },
    ]);

    expect(state.refusal).toBeNull();
    expect(state.writes).toEqual([]);
    expect(panelOf(state)).not.toContain(REFUSED.detail);
  });

  it("a resposta de A não fecha o seletor de regiões aberto no cartão de B", () => {
    const editing = { role: "obtLab" as const, regions: ["europe" as const] };
    const state = replay([
      ...grantingA,
      ...searched(3, B),
      { type: "openRegions", editing, clearsRefusal: false },
      { type: "written", ticket: 2, account: A_WITH_INTERCESSOR },
    ]);

    expect(state.editing).toEqual(editing);
  });

  it("A de volta à tela antes da resposta: o Gravando… é dele e a resposta atualiza o cartão dele", () => {
    const back = replay([...grantingA, ...searched(3, B), ...searched(4, A)]);
    expect(cardOf(back)?.acting).toBe(ROW);

    const answered = personReducer(back, { type: "written", ticket: 2, account: A_WITH_INTERCESSOR });
    expect(cardOf(answered)?.account).toBe(A_WITH_INTERCESSOR);
    expect(cardOf(answered)?.acting).toBeNull();
  });

  it("a gravação de A que responde durante uma nova busca de A vale mais que a leitura dessa busca", () => {
    const state = replay([
      ...grantingA,
      ...searched(3, B),
      { type: "search", ticket: 4, email: A.email },
      { type: "written", ticket: 2, account: A_WITH_INTERCESSOR },
      found(4, A),
    ]);

    expect(cardOf(state)?.account).toBe(A_WITH_INTERCESSOR);
  });

  it("a gravação guardada durante a busca não serve a outra pessoa nem à busca seguinte", () => {
    const other = replay([
      ...grantingA,
      { type: "search", ticket: 3, email: B.email },
      { type: "written", ticket: 2, account: A_WITH_INTERCESSOR },
      found(3, B),
    ]);
    expect(cardOf(other)?.account).toBe(B);

    const later = replay([...searched(5, A)], other);
    expect(cardOf(later)?.account).toBe(A);
  });

  it("sem corrida, como antes: a resposta atualiza o cartão e fecha o seletor; a recusa cai na linha que a causou", () => {
    const editing = { role: "resourceCircle" as const, regions: ["oceania" as const] };
    const opened = replay([...searched(1, A), { type: "openRegions", editing, clearsRefusal: true }]);
    const writing = personReducer(opened, { type: "write", ticket: 2, target: A, row: ROW });

    const saved = personReducer(writing, { type: "written", ticket: 2, account: A_WITH_INTERCESSOR });
    expect(cardOf(saved)?.account).toBe(A_WITH_INTERCESSOR);
    expect(saved.editing).toBeNull();

    const refused = personReducer(writing, { type: "refused", ticket: 2, failure: REFUSED });
    expect(refused.refusal).toEqual({ row: ROW, failure: REFUSED });
    expect(refused.editing).toEqual(editing);
  });
});

describe("a busca mais nova é a que vale (OBT-653)", () => {
  const lateAnswers: [string, PersonEvent][] = [
    ["achada", found(1, A)],
    ["nenhuma conta", { type: "answered", ticket: 1, lookup: { kind: "none", email: A.email } }],
    [
      "falhou",
      { type: "answered", ticket: 1, lookup: { kind: "failed", email: A.email, failure: REFUSED } },
    ],
  ];

  for (const [outcome, late] of lateAnswers) {
    it(`uma busca mais antiga (${outcome}) que responde depois da mais nova não substitui o cartão`, () => {
      const state = replay([
        { type: "search", ticket: 1, email: A.email },
        ...searched(2, B),
        late,
      ]);
      expect(cardOf(state)?.account).toBe(B);
    });

    it(`uma busca mais antiga (${outcome}) que responde antes da mais nova não ocupa o lugar dela`, () => {
      const state = replay([
        { type: "search", ticket: 1, email: A.email },
        { type: "search", ticket: 2, email: B.email },
        late,
      ]);
      expect(state.lookup).toEqual({ kind: "searching", email: B.email });
    });
  }
});

describe("o seletor de regiões", () => {
  it("mexer nas regiões com o seletor fechado não o reabre", () => {
    const state = replay([...searched(1, A), { type: "pickRegions", regions: ["asia"] }]);
    expect(state.editing).toBeNull();
  });

  it("abrir pelo Conceder apaga a recusa anterior; abrir pelo Editar regiões não", () => {
    const editing = { role: "obtLab" as const, regions: [] };
    const refused = replay([
      ...searched(1, A),
      { type: "write", ticket: 2, target: A, row: "resource-request-form:mesa" },
      { type: "refused", ticket: 2, failure: REFUSED },
    ]);

    expect(personReducer(refused, { type: "openRegions", editing, clearsRefusal: true }).refusal).toBeNull();
    expect(personReducer(refused, { type: "openRegions", editing, clearsRefusal: false }).refusal).not.toBeNull();
  });
});

describe("o aviso de uma gravação que terminou longe do cartão", () => {
  it("é devido quando a pessoa não está mais no cartão — com a recusa, quando houve", () => {
    const away = replay([...grantingA, ...searched(3, B)]);

    expect(awayNotice(away, { type: "written", ticket: 2, account: A_WITH_INTERCESSOR })).toEqual({
      target: A,
      failure: null,
    });
    expect(awayNotice(away, { type: "refused", ticket: 2, failure: REFUSED })).toEqual({
      target: A,
      failure: REFUSED,
    });
  });

  it("não é devido quando a pessoa ainda está no cartão, nem para um bilhete que não está no ar", () => {
    const here = replay(grantingA);
    expect(awayNotice(here, { type: "written", ticket: 2, account: A_WITH_INTERCESSOR })).toBeNull();
    expect(awayNotice(here, { type: "written", ticket: 9, account: A_WITH_INTERCESSOR })).toBeNull();
  });

  it("a loja diz o aviso a quem despacha a resposta, mesmo depois que a página saiu", () => {
    const store = createPersonStore();
    for (const event of grantingA) store.dispatch(event);
    store.dispatch({ type: "left" });

    expect(store.dispatch({ type: "written", ticket: 2, account: A_WITH_INTERCESSOR })).toEqual({
      target: A,
      failure: null,
    });
    expect(store.get().writes).toEqual([]);
  });

  it("voltar à página devolve o cartão às respostas dele", () => {
    const store = createPersonStore();
    for (const event of grantingA) store.dispatch(event);
    store.dispatch({ type: "left" });
    store.dispatch({ type: "entered" });

    expect(store.dispatch({ type: "written", ticket: 2, account: A_WITH_INTERCESSOR })).toBeNull();
    expect(cardOf(store.get())?.account).toBe(A_WITH_INTERCESSOR);
  });

  it("a loja avisa quem a lê só quando o estado muda, e cada bilhete é novo", () => {
    const store = createPersonStore();
    const heard = vi.fn();
    store.subscribe(heard);
    store.dispatch({ type: "answered", ticket: 7, lookup: { kind: "idle" } });
    expect(heard).not.toHaveBeenCalled();
    store.dispatch({ type: "search", ticket: store.ticket(), email: A.email });
    expect(heard).toHaveBeenCalledTimes(1);
    expect(store.ticket()).not.toBe(store.get().asked);
  });
});
