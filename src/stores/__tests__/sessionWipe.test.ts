import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * What a session leaves in this browser goes with it (INT-12 · OBT-417). A shared or borrowed
 * device is the normal case in the field: the next person to sign in must not inherit the
 * previous reader's projects, submissions, org chart, intercessors or unsent drafts.
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

const { matchReader, readerOf, storesWipedOn } = await import("../sessionWipe");
const { forgetTokens, setTokens } = await import("../../services/api/tokens");
const { useProjectsStore } = await import("../projectsStore");
const { useFiltersStore } = await import("../filtersStore");
const { useFormsStore } = await import("../formsStore");
const { makeProject } = await import("../../utils/__tests__/factory");

beforeEach(() => {
  storage.clear();
  tabStorage.clear();
});

describe("o que a sessão deixa no navegador", () => {
  it("sair por escolha leva o lido e o digitado; expirar leva só o lido", () => {
    expect(storesWipedOn("signedOut")).toHaveLength(9);
    expect(storesWipedOn("expired")).toHaveLength(4);
    expect(storesWipedOn("signedIn")).toHaveLength(0);
    expect(storesWipedOn("signedIn", "other")).toHaveLength(9);
    expect(storesWipedOn("signedIn", "unknown")).toHaveLength(4);
  });

  it("ao sair, a lista de projetos some da memória e do armazenamento", () => {
    setTokens({ accessToken: "a", refreshToken: "r" });
    useProjectsStore.setState({ projects: [makeProject({ id: "tikuna" })], hydrated: true });
    expect(storage.raw.get("shema-projects-v1")).toContain("tikuna");

    forgetTokens("signedOut");

    expect(useProjectsStore.getState().projects).toEqual([]);
    expect(useProjectsStore.getState().hydrated).toBe(false);
    expect(storage.raw.get("shema-projects-v1") ?? "").not.toContain("tikuna");
  });

  it("uma expiração mantém o que a pessoa digitou e não enviou", () => {
    setTokens({ accessToken: "a", refreshToken: "r" });
    useFiltersStore.setState({ search: "Morelia" });

    forgetTokens("expired");

    expect(useFiltersStore.getState().search).toBe("Morelia");
  });
});

const token = (sub: string) =>
  `h.${btoa(JSON.stringify({ sub })).replace(/\+/gu, "-").replace(/\//gu, "_").replace(/=+$/u, "")}.s`;

describe("uma expiração seguida de outra pessoa", () => {
  it("o token diz de quem é a sessão", () => {
    expect(readerOf(token("user-a"))).toBe("user-a");
    expect(readerOf("lixo")).toBeNull();
  });

  it("quem volta encontra o que digitou; outra pessoa, não", () => {
    setTokens({ accessToken: token("user-a"), refreshToken: "r" });
    useFiltersStore.setState({ search: "Morelia" });
    forgetTokens("expired");

    setTokens({ accessToken: token("user-a"), refreshToken: "r" });
    expect(useFiltersStore.getState().search).toBe("Morelia");
    forgetTokens("expired");

    setTokens({ accessToken: token("user-b"), refreshToken: "r" });
    expect(useFiltersStore.getState().search).toBe("");
  });
});

describe("a aba fechada e outra pessoa entra", () => {
  it("o que foi lido para a conta anterior não fica para a próxima", () => {
    setTokens({ accessToken: token("user-a"), refreshToken: "r" });
    useFormsStore.setState({ hydrated: true });
    // Closing the tab fires nothing: the next event this browser sees is the next sign-in.
    setTokens({ accessToken: token("user-c"), refreshToken: "r" });

    expect(useFormsStore.getState().hydrated).toBe(false);
  });

  it("sem saber quem estava, apaga o que se lê de novo e guarda o rascunho", () => {
    expect(matchReader(null, "user-a")).toBe("unknown");
    expect(matchReader("user-a", "user-a")).toBe("same");
    expect(matchReader("user-a", "user-b")).toBe("other");
  });
});

/**
 * Sair leva as vistas salvas, as avaliações e os rascunhos do Ritmo (OBT-693 — Daniel,
 * 9/nov/2026). O Prumo mediu as três chaves vivas depois de Sair (R6b, 6/nov): a vista com a
 * busca da conta anterior, e as outras duas regravadas vazias pelo reset em memória.
 */
const { useSavedViewsStore } = await import("../savedViewsStore");
const { useAssessmentStore } = await import("../assessmentStore");
const { useRhythmStore } = await import("../rhythmStore");
const { emptyDraft } = await import("../../utils/assessment");
const { usePrefsStore } = await import("../prefsStore");
const { EMPTY_FILTERS } = await import("../filtersStore");

const SAVED_VIEWS = "shema-saved-views-v1";
const ASSESSMENTS = "shema-assessments-v1";
const RHYTHM_DRAFTS = "shema-rhythm-drafts-v1";

function typeIntoTheThree(): void {
  const { sort, metaphor } = usePrefsStore.getState();
  useSavedViewsStore
    .getState()
    .saveView("user-a", "minha vista", { filters: EMPTY_FILTERS, search: "Makua", sort, metaphor });
  useAssessmentStore.getState().saveStep(emptyDraft("ashaninka", new Date("2026-11-09")));
  useRhythmStore.getState().setDraft("m1__norte", { date: "2026-11-09", notes: "pauta" });
  vi.advanceTimersByTime(1_000);
}

function expectTheThreeGone(): void {
  vi.advanceTimersByTime(1_000);
  for (const key of [SAVED_VIEWS, ASSESSMENTS, RHYTHM_DRAFTS]) {
    expect(storage.raw.has(key), key).toBe(false);
  }
  expect(useSavedViewsStore.getState().byUser).toEqual({});
  expect(useAssessmentStore.getState().drafts).toEqual({});
  expect(useRhythmStore.getState().drafts).toEqual({});
}

describe("Sair leva as vistas salvas, as avaliações e os rascunhos do Ritmo", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    return () => vi.useRealTimers();
  });

  it("depois de Sair, as três chaves não existem e os stores estão vazios", () => {
    setTokens({ accessToken: token("user-a"), refreshToken: "r" });
    typeIntoTheThree();
    expect(storage.raw.get(SAVED_VIEWS)).toContain("Makua");
    expect(storage.raw.has(ASSESSMENTS)).toBe(true);
    expect(storage.raw.get(RHYTHM_DRAFTS)).toContain("pauta");

    forgetTokens("signedOut");

    expectTheThreeGone();
  });

  it("a aba fechada e outra conta entra: nada das três fica para ela", () => {
    setTokens({ accessToken: token("user-a"), refreshToken: "r" });
    typeIntoTheThree();

    setTokens({ accessToken: token("user-b"), refreshToken: "r" });

    expectTheThreeGone();
  });

  it("Sair no diálogo da sessão expirada leva o mesmo que o Sair do cabeçalho (OBT-704)", () => {
    // A expiração já esqueceu os tokens; o Sair escolhido depois dela anunciava nada, e os
    // rascunhos e a conta guardada ficavam no aparelho como se ninguém tivesse saído.
    setTokens({ accessToken: token("user-a"), refreshToken: "r" });
    typeIntoTheThree();
    forgetTokens("expired");
    expect(storage.raw.get(SAVED_VIEWS)).toContain("Makua");

    forgetTokens("signedOut");

    expectTheThreeGone();
    expect(storage.raw.has("shema-last-reader-v1")).toBe(false);
  });

  it("uma expiração ainda guarda o que a pessoa salvou, para quem volta", () => {
    setTokens({ accessToken: token("user-a"), refreshToken: "r" });
    typeIntoTheThree();

    forgetTokens("expired");

    expect(storage.raw.get(SAVED_VIEWS)).toContain("Makua");
    expect(useSavedViewsStore.getState().byUser["user-a"]).toHaveLength(1);
  });
});

/**
 * Toda chave `shema-*` que o código grava tem dono aqui: ou sai com a sessão, e isso é provado
 * semeando-a e saindo, ou fica por um motivo escrito. Uma chave nova que não esteja em nenhuma
 * das duas listas reprova a suíte.
 */
const WIPED_ON_SIGN_OUT: Record<string, typeof storage> = {
  "shema-projects-v1": storage,
  "shema-form-submissions-v1": storage,
  "shema-regions-v1": storage,
  "shema-intercessors-v1": tabStorage,
  "shema-assessments-v1": storage,
  "shema-record-drafts-v1": storage,
  "shema-rhythm-drafts-v1": storage,
  "shema-filters-v1": storage,
  "shema-saved-views-v1": storage,
};

const KEPT_ON_PURPOSE: Record<string, string> = {
  "shema-last-reader-v1": "o id opaco que decide, no próximo login, se é outra conta",
  "shema-theme-v1": "claro ou escuro, sem dado de ninguém",
  "shema-prefs-v1": "ordenação, metáfora do card e língua, sem dado de ninguém",
  "shema-notifications-v1": "só o feed derivado do modo fixture grava; com o servidor, é da conta",
  "shema-intake-draft-v2": "na aba (sessionStorage), sob o hash do token do link, sai no envio",
  "shema-intake-draft-v1": "legado: lido uma vez e apagado inteiro (OBT-558)",
  "shema-rhythm-v1": "legado: lido uma vez e apagado (INT-07)",
  "shema-session-v1": "o papel escolhido no dublê do modo fixture",
};

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === "__tests__" ? [] : sourceFiles(path);
    return /\.tsx?$/u.test(entry.name) && !/\.test\.tsx?$/u.test(entry.name) ? [path] : [];
  });
}

describe("toda chave do navegador tem dono", () => {
  it("cada chave shema-* gravada no código sai com a sessão ou fica por um motivo escrito", () => {
    const written = new Set(
      sourceFiles(join(process.cwd(), "src")).flatMap((file) =>
        [...readFileSync(file, "utf8").matchAll(/["'`](shema-[a-z0-9-]+-v\d+)["'`]/gu)].map(
          (match) => match[1],
        ),
      ),
    );
    const owned = new Set([...Object.keys(WIPED_ON_SIGN_OUT), ...Object.keys(KEPT_ON_PURPOSE)]);

    expect([...written].filter((key) => !owned.has(key))).toEqual([]);
    expect([...owned].filter((key) => !written.has(key))).toEqual([]);
  });

  it("as que saem com a sessão não sobram no armazenamento onde moram", () => {
    vi.useFakeTimers();
    setTokens({ accessToken: token("user-a"), refreshToken: "r" });
    for (const [key, home] of Object.entries(WIPED_ON_SIGN_OUT)) {
      home.setItem(key, '{"state":{},"version":1}');
    }

    forgetTokens("signedOut");
    vi.advanceTimersByTime(1_000);
    vi.useRealTimers();

    const left = Object.entries(WIPED_ON_SIGN_OUT)
      .filter(([key, home]) => home.raw.has(key))
      .map(([key]) => key);
    expect(left).toEqual([]);
  });
});
