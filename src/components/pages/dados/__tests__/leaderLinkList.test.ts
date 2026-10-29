import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { IntakeLink, IntakeLinkCreated } from "../../../../types/forms";
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
const { createEmptyProject } = await import("../../../../fixtures/blank");
const { createLinkListStore, viewFor } = await import("../leaderLinkList");
const { LeaderLinkDialogBody } = await import("../LeaderLinkDialog");
type LinkListAPI = import("../leaderLinkList").LinkListAPI;
type LinkListStore = import("../leaderLinkList").LinkListStore;

beforeEach(async () => {
  await i18n.changeLanguage("pt");
});

interface Held<T> {
  resolve: (value: T) => void;
  reject: (reason: unknown) => void;
}

function hold<T>(): Held<T> & { promise: Promise<T> } {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((done, fail) => {
    resolve = done;
    reject = fail;
  });
  return { promise, resolve, reject };
}

function fakeAPI() {
  const reads: { projectId: string; answer: Held<IntakeLink[]> }[] = [];
  const mints: { projectId: string; answer: Held<IntakeLinkCreated> }[] = [];
  const revokes: { linkId: string; answer: Held<IntakeLink> }[] = [];
  const api: LinkListAPI = {
    listIntakeLinks: (projectId) => {
      const answer = hold<IntakeLink[]>();
      reads.push({ projectId: projectId ?? "", answer });
      return answer.promise;
    },
    mintIntakeLink: ({ projectId }) => {
      const answer = hold<IntakeLinkCreated>();
      mints.push({ projectId, answer });
      return answer.promise;
    },
    revokeIntakeLink: (linkId) => {
      const answer = hold<IntakeLink>();
      revokes.push({ linkId, answer });
      return answer.promise;
    },
  };
  return { api, reads, mints, revokes };
}

const settle = () => new Promise((done) => setTimeout(done, 0));

const link = (id: string, projectId: string, status: IntakeLink["status"] = "pending"): IntakeLink => ({
  id,
  projectId,
  definitionVersion: 1,
  expiresAt: "2026-12-13",
  status,
  createdAt: "2026-10-29",
  usedAt: null,
  revokedAt: status === "revoked" ? "2026-10-29" : null,
});

const created = (id: string, projectId: string): IntakeLinkCreated => ({
  ...link(id, projectId),
  token: `token-${id}`,
  url: `http://localhost:5173/intake/token-${id}`,
});

const PENDING = link("l-1", "beta");
const REVOKED = link("l-1", "beta", "revoked");

const FAILURE: ApiFailure = { kind: "offline", status: null, code: null, detail: null };

const linksOf = (store: LinkListStore) => {
  const { list } = store.get();
  return list.kind === "read" ? list.links : list.kind;
};

const statusOf = (store: LinkListStore, id: string) => {
  const links = linksOf(store);
  return typeof links === "string" ? links : links.find((row) => row.id === id)?.status;
};

describe("a lista de links do líder só mostra a resposta mais nova do projeto aberto (OBT-661)", () => {
  it("a leitura atrasada, que volta depois da revogação, é descartada: a linha segue Revogado e a lista termina como o servidor responde", async () => {
    const { api, reads, revokes } = fakeAPI();
    const store = createLinkListStore(api);
    store.show("beta");
    reads[0].answer.resolve([PENDING]);
    await settle();

    store.show("beta");
    const revoking = store.revoke(PENDING.id);
    revokes[0].answer.resolve(REVOKED);
    await revoking;
    expect(statusOf(store, PENDING.id)).toBe("revoked");
    expect(reads).toHaveLength(3);

    reads[1].answer.resolve([PENDING]);
    await settle();
    expect(statusOf(store, PENDING.id)).toBe("revoked");

    reads[2].answer.resolve([REVOKED]);
    await settle();
    expect(linksOf(store)).toEqual([REVOKED]);
  });

  it("a lista do projeto anterior, que chega depois da troca, é descartada e nunca aparece sob o projeto novo", async () => {
    const { api, reads } = fakeAPI();
    const store = createLinkListStore(api);
    store.show("alfa");
    expect(viewFor(store.get(), "beta").list).toEqual({ kind: "unread" });

    store.show("beta");
    reads[0].answer.resolve([link("a-1", "alfa")]);
    await settle();
    expect(store.get()).toMatchObject({ projectId: "beta", list: { kind: "unread" } });

    reads[1].answer.resolve([link("b-1", "beta")]);
    await settle();
    expect(linksOf(store)).toEqual([link("b-1", "beta")]);
  });

  it("gerar no meio da primeira leitura: a resposta velha não apaga o link gerado", async () => {
    const { api, reads, mints } = fakeAPI();
    const store = createLinkListStore(api);
    store.show("beta");
    const minting = store.mint("beta");
    mints[0].answer.resolve(created("l-new", "beta"));
    await minting;
    expect(store.get().minted?.id).toBe("l-new");
    expect(linksOf(store)).toBe("unread");

    reads[0].answer.resolve([]);
    await settle();
    expect(linksOf(store)).toBe("unread");

    reads[1].answer.resolve([link("l-new", "beta")]);
    await settle();
    expect(linksOf(store)).toEqual([link("l-new", "beta")]);
  });

  it("a resposta de gerar ou revogar de um projeto que você já deixou não toca a lista nem mostra o link gerado", async () => {
    const { api, reads, mints, revokes } = fakeAPI();
    const store = createLinkListStore(api);
    store.show("alfa");
    reads[0].answer.resolve([link("a-1", "alfa")]);
    await settle();

    const minting = store.mint("alfa");
    const revoking = store.revoke("a-1");
    store.show("beta");
    reads[1].answer.resolve([link("b-1", "beta")]);
    await settle();

    mints[0].answer.resolve(created("a-2", "alfa"));
    revokes[0].answer.resolve(link("a-1", "alfa", "revoked"));
    await Promise.all([minting, revoking]);

    expect(store.get()).toMatchObject({ projectId: "beta", minted: null, revoking: [] });
    expect(linksOf(store)).toEqual([link("b-1", "beta")]);
    expect(reads).toHaveLength(2);
  });

  it("sem leitura no ar, a revogação vale na hora e não pede GET a mais", async () => {
    const { api, reads, revokes } = fakeAPI();
    const store = createLinkListStore(api);
    store.show("beta");
    reads[0].answer.resolve([PENDING]);
    await settle();

    const revoking = store.revoke(PENDING.id);
    revokes[0].answer.resolve(REVOKED);
    await revoking;
    expect(linksOf(store)).toEqual([REVOKED]);
    expect(reads).toHaveLength(1);
  });

  it("a falha de uma leitura passada é descartada; a da última vira falha, e gerar sobre ela relê", async () => {
    const { api, reads, mints } = fakeAPI();
    const store = createLinkListStore(api);
    store.show("alfa");
    store.show("beta");
    reads[0].answer.reject(new Error("rede"));
    await settle();
    expect(linksOf(store)).toBe("unread");

    reads[1].answer.reject(FAILURE);
    await settle();
    expect(store.get().list).toEqual({ kind: "failed", failure: FAILURE });

    const minting = store.mint("beta");
    mints[0].answer.resolve(created("l-new", "beta"));
    await minting;
    expect(reads).toHaveLength(3);
  });
  it("Tentar de novo sobre uma falha volta a carregando, sem botão para pedir outro GET", async () => {
    const { api, reads } = fakeAPI();
    const store = createLinkListStore(api);
    store.show("beta");
    reads[0].answer.reject(FAILURE);
    await settle();
    expect(store.get().list.kind).toBe("failed");

    store.read("beta");
    expect(store.get().list).toEqual({ kind: "unread" });
    reads[1].answer.resolve([PENDING]);
    await settle();
    expect(linksOf(store)).toEqual([PENDING]);
  });
});

describe("o endereço gerado aparece uma vez só (PME-FRM-041)", () => {
  it("fechar e reabrir o diálogo com o mesmo projeto não mostra de novo o endereço gerado", async () => {
    const { api, reads, mints } = fakeAPI();
    const store = createLinkListStore(api);
    store.show("beta");
    reads[0].answer.resolve([]);
    await settle();
    const minting = store.mint("beta");
    mints[0].answer.resolve(created("l-new", "beta"));
    await minting;
    expect(viewFor(store.get(), "beta").minted?.url).toContain("token-l-new");

    store.hide();
    expect(viewFor(store.get(), "beta").minted).toBeNull();
    store.show("beta");
    expect(viewFor(store.get(), "beta").minted).toBeNull();
  });

  it("a releitura que a geração pede não apaga o endereço que acabou de aparecer", async () => {
    const { api, reads, mints } = fakeAPI();
    const store = createLinkListStore(api);
    store.show("beta");
    const minting = store.mint("beta");
    mints[0].answer.resolve(created("l-new", "beta"));
    await minting;
    reads[1].answer.resolve([link("l-new", "beta")]);
    await settle();
    expect(store.get().minted?.id).toBe("l-new");
  });
});

describe("a revogação no ar se diz na linha", () => {
  it("enquanto o POST não volta a linha diz Revogando e o botão espera; se ele falha, o botão volta", async () => {
    const { api, reads, revokes } = fakeAPI();
    const store = createLinkListStore(api);
    store.show("beta");
    reads[0].answer.resolve([PENDING]);
    await settle();

    const revoking = store.revoke(PENDING.id);
    expect(store.get().revoking).toEqual([PENDING.id]);
    revokes[0].answer.reject(FAILURE);
    await expect(revoking).rejects.toBe(FAILURE);
    expect(store.get().revoking).toEqual([]);
    expect(statusOf(store, PENDING.id)).toBe("pending");
  });
});

describe("o diálogo desenha o que o store diz", () => {
  const project = { ...createEmptyProject("beta"), languageName: "Beta", location: "Fiji" };
  const noop = () => undefined;
  const body = (over: Partial<Parameters<typeof LeaderLinkDialogBody>[0]>) =>
    renderToStaticMarkup(
      createElement(LeaderLinkDialogBody, {
        projects: [project],
        selectedProjectId: "beta",
        onSelectProject: noop,
        links: [PENDING],
        minted: null,
        minting: false,
        onMint: noop,
        onRevoke: noop,
        error: null,
        ...over,
      }),
    );

  it("a linha em revogação mostra Revogando… com o botão desabilitado", () => {
    const out = body({ revoking: [PENDING.id] });
    expect(out).toContain(i18n.t("intake_revoking"));
    expect(out).toMatch(/<button[^>]*disabled=""[^>]*>.*Revogando…/su);
    expect(body({})).not.toContain(i18n.t("intake_revoking"));
  });

  it("a falha de leitura diz que falhou e oferece Tentar de novo, em vez de lista vazia", () => {
    const out = body({ links: null, linksFailure: FAILURE, onRetryLinks: noop });
    expect(out).toContain(i18n.t("net_retry"));
    expect(out).toContain('role="alert"');
    expect(out).not.toContain(i18n.t("intake_links_empty"));
  });

  it("o diálogo lê e escreve os links só pelo store da lista", async () => {
    const source = (await import("../LeaderLinkDialog?raw")).default;
    expect(source).not.toMatch(/\b(listIntakeLinks|mintIntakeLink|revokeIntakeLink)\b/u);
    expect(source).toMatch(/createLinkListStore\(/u);
    expect(source).toMatch(/viewFor\(/u);
  });
});
