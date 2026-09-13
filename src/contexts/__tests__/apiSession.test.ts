import { describe, expect, it } from "vitest";
import {
  keepsWorkMounted,
  sessionSurface,
} from "../../components/layout/sessionSurface";
import type { ApiFailure, ShemaSession } from "../../types/session";
import {
  ANONYMOUS,
  apiSessionReducer,
  type ApiSessionAction,
  type ApiSessionState,
} from "../apiSession";
import type { SessionStatus } from "../session";

const SESSION: ShemaSession = {
  role: "coordinator",
  regionScope: ["south-america"],
  name: "Nome do Organograma",
};

const REFUSED: ApiFailure = {
  kind: "unauthorized",
  status: 401,
  code: null,
  detail: null,
};

const TYPO: ApiSessionAction[] = [
  { type: "proving" },
  { type: "refused", failure: REFUSED },
];

const IN: ApiSessionAction[] = [
  { type: "proving" },
  { type: "proved", accountId: "u-1", session: SESSION },
];

function replay(
  actions: ApiSessionAction[],
  from: ApiSessionState = ANONYMOUS,
): ApiSessionState {
  return actions.reduce(apiSessionReducer, from);
}

function surfaceOf(state: ApiSessionState) {
  return sessionSurface(state.status, true);
}

describe("entrar e sair", () => {
  it("provar a sessão leva a pronto, com a conta e o nome do organograma", () => {
    const state = replay(IN);
    expect(state.status).toBe("ready");
    expect(state.signed).toEqual({ accountId: "u-1", session: SESSION });
    expect(state.failure).toBeNull();
  });

  it("uma tentativa começando limpa a recusa anterior", () => {
    const refused = replay(TYPO);
    expect(refused.failure).toBe(REFUSED);
    expect(replay([{ type: "proving" }], refused).failure).toBeNull();
  });

  it("sair explicitamente volta ao começo", () => {
    expect(replay([...IN, { type: "left" }])).toEqual(ANONYMOUS);
  });
});

describe("uma recusa devolve a pessoa à superfície de onde ela veio", () => {
  it("recusar a primeira entrada é a tela de entrada", () => {
    const state = replay(TYPO);
    expect(state.status).toBe("anonymous");
    expect(surfaceOf(state)).toBe("signIn");
  });

  it("recusar a reautenticação segue reautenticação, e o trabalho fica", () => {
    const expired = replay([...IN, { type: "expired" }]);
    expect(expired.status).toBe("expired");

    const typo = replay(TYPO, expired);
    expect(typo.status).toBe("expired");
    expect(surfaceOf(typo)).toBe("reauth");
    expect(keepsWorkMounted(surfaceOf(typo))).toBe(true);
    expect(typo.failure).toBe(REFUSED);
  });

  it("e a senha pode ser errada quantas vezes for", () => {
    let state = replay([...IN, { type: "expired" }]);
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      state = replay(TYPO, state);
      expect(keepsWorkMounted(surfaceOf(state)), `tentativa ${attempt}`).toBe(
        true,
      );
    }
  });

  it("e a regra conhece só esses dois destinos", () => {
    for (const before of ["anonymous", "loading", "ready"] as const) {
      const state = replay(TYPO, { ...ANONYMOUS, status: before });
      expect(state.status, before).toBe("anonymous");
    }
    expect(replay(TYPO, { ...ANONYMOUS, status: "expired" }).status).toBe(
      "expired",
    );
  });
});

describe("um evento de token que a própria tentativa causou não é notícia", () => {
  it("o logout do catch não desmonta o trabalho de quem reautenticava", () => {
    const expired = replay([...IN, { type: "expired" }]);
    const halfway = replay(
      [
        { type: "proving" },
        { type: "dropped" },
        { type: "refused", failure: REFUSED },
      ],
      expired,
    );
    expect(halfway.status).toBe("expired");
    expect(keepsWorkMounted(surfaceOf(halfway))).toBe(true);
  });

  it("e expirar na primeira entrada não pede senha por cima de app nenhum", () => {
    const state = replay([
      { type: "proving" },
      { type: "expired" },
      { type: "refused", failure: REFUSED },
    ]);
    expect(state.status).toBe("anonymous");
    expect(surfaceOf(state)).toBe("signIn");
  });
});

describe("fora de uma tentativa, o evento do token manda", () => {
  it("a sessão que expira guarda a conta e pede a senha por cima", () => {
    const state = replay([...IN, { type: "expired" }]);
    expect(state.status).toBe("expired");
    expect(state.signed).not.toBeNull();
    expect(keepsWorkMounted(surfaceOf(state))).toBe(true);
  });

  it("os tokens indo embora sem tentativa nenhuma é ficar anônimo", () => {
    const state = replay([...IN, { type: "dropped" }]);
    expect(state.status).toBe("anonymous");
    expect(state.signed).toBeNull();
  });

  it("cada estado que o modelo alcança tem uma superfície, e só uma", () => {
    const expired = replay([...IN, { type: "expired" }]);
    const reached: [SessionStatus, string][] = [
      [ANONYMOUS.status, "signIn"],
      [replay(IN).status, "app"],
      [expired.status, "reauth"],
      [replay(TYPO).status, "signIn"],
      [replay(TYPO, expired).status, "reauth"],
    ];
    for (const [status, surface] of reached) {
      expect(sessionSurface(status, true), status).toBe(surface);
    }
  });
});
