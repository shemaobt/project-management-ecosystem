import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ApiSessionAction, ApiSessionState } from "../../../contexts/apiSession";
import type { ApiFailure, ShemaSession } from "../../../types/session";

/**
 * Sair esquece o endereço (OBT-626). Projetos guarda a busca e os filtros na URL e os relê ao
 * montar: um Sair que só limpasse o armazenamento deixaria `/projetos?status=…&q=…` na barra, e a
 * próxima conta a entrar na mesma aba abriria Projetos com a busca da anterior.
 */
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
const tabStorage = createMemoryStorage();
vi.stubGlobal("localStorage", storage);
vi.stubGlobal("sessionStorage", tabStorage);
vi.stubGlobal("window", { localStorage: storage, sessionStorage: tabStorage });

await import("../../../stores/sessionWipe");
const { forgetTokens, setTokens } = await import("../../../services/api/tokens");
const { EMPTY_FILTERS, useFiltersStore } = await import("../../../stores/filtersStore");
const { decodeView, isEmptyView } = await import("../../../utils/filterSerialisation");
const { ANONYMOUS, apiSessionReducer } = await import("../../../contexts/apiSession");
const { SIGNED_OUT_ADDRESS, forgetsAddress, sessionSurface } = await import("../sessionSurface");

const ORIGIN = "http://console.test";
const LEFT = "/projetos?status=em-andamento&q=Lingala";

const SESSION: ShemaSession = {
  role: "coordinator",
  roles: ["coordinator"],
  regionScope: ["africa"],
  name: null,
  apps: { resourceRequestForm: null },
};

const REFUSED: ApiFailure = { kind: "forbidden", status: 403, code: null, detail: null };

const IN: ApiSessionAction[] = [
  { type: "proving" },
  { type: "proved", accountId: "conta-a", session: SESSION },
];
const TYPO: ApiSessionAction[] = [{ type: "proving" }, { type: "refused", failure: REFUSED }];
// The header's Sair: the token event the logout fires, then the choice.
const SAIR: ApiSessionAction[] = [{ type: "dropped" }, { type: "left" }];
// The expired dialog's Sair: the tokens are already gone, so only the choice arrives.
const SAIR_EXPIRADA: ApiSessionAction[] = [{ type: "left" }];
// A re-authentication refused at the session read: its own logout is no news.
const REENTRADA_RECUSADA: ApiSessionAction[] = [
  { type: "proving" },
  { type: "dropped" },
  { type: "refused", failure: REFUSED },
];

function replay(actions: ApiSessionAction[], from: ApiSessionState = ANONYMOUS): ApiSessionState {
  return actions.reduce(apiSessionReducer, from);
}

function forgets(from: ApiSessionState, actions: ApiSessionAction[]): boolean {
  return forgetsAddress(
    sessionSurface(from.status, true),
    sessionSurface(replay(actions, from).status, true),
  );
}

const token = (sub: string) =>
  `h.${btoa(JSON.stringify({ sub })).replace(/\+/gu, "-").replace(/\//gu, "_").replace(/=+$/u, "")}.s`;

const READY = replay(IN);
const EXPIRED = replay([{ type: "expired" }], READY);

beforeEach(() => {
  storage.clear();
  tabStorage.clear();
});

describe("Sair esquece o endereço", () => {
  it("sair em /projetos?status=em-andamento&q=Lingala e entrar com outra conta: o endereço volta ao início e os filtros e a busca chegam vazios", () => {
    setTokens({ accessToken: token("conta-a"), refreshToken: "r" });
    const read = decodeView(new URL(LEFT, ORIGIN).searchParams);
    useFiltersStore.getState().applyState(read.filters, read.search);
    expect(useFiltersStore.getState().search).toBe("Lingala");

    forgetTokens("signedOut");
    const address = forgets(READY, SAIR) ? SIGNED_OUT_ADDRESS : LEFT;

    setTokens({ accessToken: token("conta-b"), refreshToken: "r" });
    const landed = new URL(address, ORIGIN);

    expect(landed.pathname).toBe("/");
    expect(landed.search).toBe("");
    expect(isEmptyView(decodeView(landed.searchParams))).toBe(true);
    expect(useFiltersStore.getState().filters).toEqual(EMPTY_FILTERS);
    expect(useFiltersStore.getState().search).toBe("");
    expect(storage.raw.get("shema-filters-v1") ?? "").not.toContain("Lingala");
    forgetTokens("signedOut");
  });

  it("sair pelo aviso de sessão expirada também leva ao início", () => {
    expect(forgets(EXPIRED, SAIR_EXPIRADA)).toBe(true);
  });
});

describe("só o Sair mexe no endereço", () => {
  it("abrir sem sessão e entrar guarda o endereço — o link compartilhado sobrevive à entrada, e a senha errada não tira a pessoa dele", () => {
    expect(forgets(ANONYMOUS, IN)).toBe(false);
    expect(forgets(ANONYMOUS, TYPO)).toBe(false);
  });

  it("expirar e reentrar não mexem no endereço, nem a reentrada recusada — o trabalho continua montado", () => {
    expect(forgets(READY, [{ type: "expired" }])).toBe(false);
    expect(forgets(EXPIRED, IN)).toBe(false);
    expect(forgets(EXPIRED, REENTRADA_RECUSADA)).toBe(false);
  });

  it("a sessão mockada (fixtures) nunca muda o endereço", () => {
    expect(
      forgetsAddress(sessionSurface("ready", false), sessionSurface("anonymous", false)),
    ).toBe(false);
  });
});
