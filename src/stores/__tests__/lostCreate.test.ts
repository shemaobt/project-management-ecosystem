import axios, { AxiosError, type InternalAxiosRequestConfig } from "axios";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * PME-PRJ-052 at the wire (OBT-625): a create that reached the server and lost its answer,
 * then "Salvar de novo". The server is a small one with state — it files, stamps and guards
 * versions the way `shema-api` does — because the guarantee is about what it holds at the end:
 * one project, and no need filed twice.
 */
vi.mock("../../services/api/source", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("../../services/api/source")>();
  return { ...actual, resolveSource: () => "api" as const };
});

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

const { http } = await import("../../services/api/client");
const { useProjectRecordStore } = await import("../projectRecordStore");
const { flushDraftWrites, materializeDraft, makeEmptyProject, NEW_RECORD, useRecordStore } =
  await import("../recordStore");
const { useProjectsStore } = await import("../projectsStore");
const { landedAddress } = await import("../../components/pages/ficha/recordMode");
const { FILED_VERSION } = await import("../../services/api");

type Wire = Record<string, unknown>;
type WireNeed = Record<string, unknown>;

const DAY = "2026-10-26";
const ID = "9eecfb4c-7d88-4eac-9c78-8bfe13f26fcb";

interface Held {
  wire: Wire;
  version: number;
  movedSinceFiled: string[];
}

const server = new Map<string, Held>();
const sent: InternalAxiosRequestConfig[] = [];
let loseNextAnswer = false;
let dropNextPatch = false;
let readAs: "coordination" | "other" = "coordination";
let needSeq = 0;

/** A need as `_new_need` files it: an id, the day when none was sent, two decimals, the visto. */
function fileNeed(row: WireNeed): WireNeed {
  const { acknowledged, ...rest } = row;
  const amount = rest.estimatedAmount as string | null;
  return {
    ...rest,
    id: `need-${++needSeq}`,
    submittedAt: rest.submittedAt ?? DAY,
    estimatedAmount: amount ? Number(amount).toFixed(2) : null,
    estimatedCurrency: rest.estimatedCurrency
      ? String(rest.estimatedCurrency).trim().toUpperCase()
      : null,
    acknowledgedAt: acknowledged ? DAY : null,
    acknowledgedBy: acknowledged ? "Carla Coordenadora" : null,
  };
}

/** A book row in the server model's field order — `{name, …, id}`. */
const bookRow = ({ id, ...rest }: Wire) => ({ ...rest, id });

function filed(body: Wire): Wire {
  return {
    healthEmotional: null,
    healthRelational: null,
    healthSpiritual: null,
    healthPhysical: null,
    healthAssessmentDate: null,
    healthAssessor: "",
    healthNotes: "",
    healthHistory: null,
    materials: [],
    mediaPhotos: null,
    mediaVideos: null,
    progressHistory: [],
    derived: null,
    ...body,
    ywamBase: body.team,
    bookProgress: (body.bookProgress as Wire[]).map(bookRow),
    needsItems: (body.needsItems as WireNeed[]).map(fileNeed),
  };
}

/** What a reader outside the truth of a sensitive project is handed (OBT-556). */
function asRead(wire: Wire): Wire {
  if (readAs === "coordination") return { ...wire, readAs };
  return {
    ...wire,
    readAs,
    sensitiveCountry: true,
    locationWithheld: true,
    location: "africa",
    notes: "",
    needsItems: (wire.needsItems as WireNeed[]).map((need) => ({ ...need, description: "" })),
  };
}

const etag = (version: number) => `"${version}"`;

function reply(config: InternalAxiosRequestConfig, status: number, data: unknown, version?: number) {
  const response = {
    data,
    status,
    statusText: "",
    headers: version === undefined ? {} : { etag: etag(version) },
    config,
  };
  const accepted = config.validateStatus
    ? config.validateStatus(status)
    : status >= 200 && status < 300;
  if (accepted) return response;
  throw new AxiosError("refused", "ERR_BAD_REQUEST", config, null, response as never);
}

function patch(config: InternalAxiosRequestConfig, held: Held) {
  const quoted = Number(String(config.headers["If-Match"]).replaceAll('"', ""));
  if (quoted !== held.version) {
    return reply(config, 409, {
      detail: "This record was saved by somebody else.",
      code: "CONFLICT",
      expectedVersion: quoted,
      currentVersion: held.version,
      changedFields: held.movedSinceFiled,
      changedBy: "Maria",
      changedAt: `${DAY}T14:02:00+00:00`,
    }, held.version);
  }
  const body = JSON.parse(String(config.data)) as Wire;
  const next: Wire = { ...held.wire, ...body };
  if (body.needsItems) {
    const kept = new Map((held.wire.needsItems as WireNeed[]).map((need) => [need.id, need]));
    for (const row of body.needsItems as WireNeed[]) {
      if (row.id) {
        const rest = { ...row };
        delete rest.acknowledged;
        kept.set(row.id, { ...kept.get(row.id), ...rest });
      } else {
        const created = fileNeed(row);
        kept.set(created.id, created);
      }
    }
    next.needsItems = [...kept.values()];
  }
  held.wire = next;
  held.version += 1;
  return reply(config, 200, asRead(held.wire), held.version);
}

const adapter = async (config: InternalAxiosRequestConfig) => {
  sent.push(config);
  const url = config.url ?? "";
  if (config.method === "post" && url === "/shema/projects") {
    const body = JSON.parse(String(config.data)) as Wire;
    const id = String(body.id);
    if (server.has(id)) {
      return reply(config, 409, {
        detail: `${id}: a project already exists at this id`,
        code: "CONFLICT",
      });
    }
    server.set(id, { wire: filed(body), version: 1, movedSinceFiled: [] });
    if (loseNextAnswer) {
      loseNextAnswer = false;
      throw new AxiosError("timeout of 20000ms exceeded", "ECONNABORTED", config);
    }
    return reply(config, 201, asRead(server.get(id)!.wire), 1);
  }
  const id = decodeURIComponent(url.replace("/shema/projects/", ""));
  const held = server.get(id);
  if (!held) return reply(config, 404, { detail: "Project not found", code: "NOT_FOUND" });
  if (config.method === "get") return reply(config, 200, asRead(held.wire), held.version);
  if (config.method === "patch") {
    if (dropNextPatch) {
      dropNextPatch = false;
      throw new AxiosError("Network Error", "ERR_NETWORK", config);
    }
    return patch(config, held);
  }
  return reply(config, 500, null);
};

http.defaults.adapter = adapter;
axios.defaults.adapter = adapter;

/** Somebody else saves the record after it was filed. */
function editedBySomebody(fields: Wire) {
  const held = server.get(ID)!;
  held.wire = { ...held.wire, ...fields };
  held.version += 1;
  held.movedSinceFiled.push(...Object.keys(fields));
}

const store = () => useProjectRecordStore.getState();
const drafts = () => useRecordStore.getState().drafts;
const writes = (method: string) => sent.filter((config) => config.method === method);

/** The new record as the coordinator filled it, and the draft that holds it. */
const TYPED = {
  id: ID,
  languageName: "pme-625 Rede052 (QA)",
  bridgeLanguage: "Português",
  location: "Mozambique, Lichinga",
  team: "YWAM QA",
  ywamBase: "YWAM QA",
  mentor: "Mentor 052",
  objective: ["NT" as const],
  bookProgress: [
    { id: "RUT", name: "Rute", chapters: 4, translated: 1, communityChecked: 0, mentorApproved: 0 },
  ],
  needsItems: [
    {
      category: "financial" as const,
      urgency: "high" as const,
      status: "open" as const,
      description: "Van para o campo",
      estimatedAmount: "1500",
      estimatedCurrency: "BRL",
    },
  ],
};

/** `attempt()` on `/ficha/novo`: the merge materialized at the minted id, and the overlay. */
const creating = () => {
  const typed = drafts()[NEW_RECORD];
  return {
    values: materializeDraft({ ...typed, readAs: "coordination" }, ID),
    typed,
    isNew: true,
    readsHealth: true,
    writesHealth: true,
  };
};

/** What the page does with a landing: the remainder under the record, then the record's read. */
async function landAsThePage() {
  const outcome = store().outcome;
  if (outcome?.kind !== "landed") throw new Error(`esperava landed, veio ${outcome?.kind}`);
  useRecordStore.getState().discardDraft(NEW_RECORD);
  if (Object.keys(outcome.carried).length > 0) {
    useRecordStore.getState().updateDraft(outcome.id, outcome.carried);
  }
  if (outcome.pending.length > 0) useRecordStore.getState().markFiled(outcome.id, FILED_VERSION);
  await store().open(outcome.id);
  return outcome;
}

/** `attempt()` on `/ficha/<id>`: the record under the overlay, as `useDraft` merges it. */
const savingLanded = () => {
  const typed = drafts()[ID] ?? {};
  return {
    values: { ...makeEmptyProject(), ...store().record!.project, ...typed },
    typed,
    isNew: false,
    readsHealth: true,
    writesHealth: true,
    filedAt: useRecordStore.getState().filedAt[ID],
  };
};

/** What the page does with a save's answer on `/ficha/<id>`. */
async function applyAsThePage() {
  const outcome = await store().save(savingLanded());
  if (outcome.kind === "saved") {
    useRecordStore.getState().settleDraft(ID, outcome.report.writtenFields);
  }
  if (outcome.kind === "conflict") useRecordStore.getState().forgetFiled(ID);
  return outcome;
}

async function loseTheFirstAnswer() {
  useRecordStore.getState().updateDraft(NEW_RECORD, structuredClone(TYPED));
  loseNextAnswer = true;
  const first = await store().save(creating());
  expect(first.kind).toBe("failed");
  expect(server.size).toBe(1);
}

beforeEach(() => {
  server.clear();
  sent.length = 0;
  loseNextAnswer = false;
  dropNextPatch = false;
  readAs = "coordination";
  needSeq = 0;
  useRecordStore.setState({ drafts: {}, filedAt: {} });
  useProjectsStore.setState({ outdated: false });
  store().forget();
});

describe("a criação cuja resposta se perdeu (OBT-625, PME-PRJ-052)", () => {
  it("Salvar de novo termina na ficha salva, sem segundo projeto", async () => {
    await loseTheFirstAnswer();
    expect(drafts()[NEW_RECORD]).toMatchObject({ languageName: TYPED.languageName });

    const again = await store().save(creating());

    expect(again.kind).toBe("landed");
    if (again.kind !== "landed") return;
    expect(again.id).toBe(ID);
    // O livro volta noutra ordem de chaves e a necessidade com id, dia e duas casas: nada
    // disso é diferença.
    expect(again.pending).toEqual([]);
    expect(again.carried).toEqual({});
    expect(landedAddress(again.id, "equipe", again.pending)).toBe(`/ficha/${ID}/equipe`);
    expect(writes("post").map((config) => JSON.parse(String(config.data)).id)).toEqual([ID, ID]);
    expect(server.size).toBe(1);
    expect(useProjectsStore.getState().outdated).toBe(true);

    await landAsThePage();
    expect(drafts()[NEW_RECORD]).toBeUndefined();
    expect(drafts()[ID]).toBeUndefined();
    expect(store().record?.project.id).toBe(ID);
    // A releitura da página não apaga o aviso: é o mesmo id.
    expect(store().outcome?.kind).toBe("landed");
  });

  it("o que foi digitado depois do corte vai por PATCH com If-Match, e só a diferença", async () => {
    await loseTheFirstAnswer();
    useRecordStore.getState().updateDraftValue(NEW_RECORD, "needsItems", (needs) => [
      ...(needs ?? []),
      { category: "equipment", urgency: "low", status: "open", description: "Gravador" },
    ]);
    useRecordStore.getState().updateDraft(NEW_RECORD, { notes: "contei depois do corte" });

    const again = await store().save(creating());
    expect(again.kind).toBe("landed");
    if (again.kind !== "landed") return;
    expect(again.pending).toEqual(["needsItems", "notes"]);
    expect(landedAddress(again.id, "notas", again.pending)).toBe(`/ficha/${ID}/notas?modo=editar`);

    await landAsThePage();
    const applied = await store().save(savingLanded());

    expect(applied.kind).toBe("saved");
    const [only] = writes("patch");
    expect(only.headers["If-Match"]).toBe('"1"');
    expect(Object.keys(JSON.parse(String(only.data))).sort()).toEqual(["needsItems", "notes"]);
    const held = server.get(ID)!;
    expect(server.size).toBe(1);
    expect((held.wire.needsItems as WireNeed[]).map((need) => need.description)).toEqual([
      "Van para o campo",
      "Gravador",
    ]);
    expect(held.wire.notes).toBe("contei depois do corte");
  });

  it("a necessidade editada depois do corte é atualizada no lugar, não duplicada", async () => {
    await loseTheFirstAnswer();
    useRecordStore.getState().updateDraftValue(NEW_RECORD, "needsItems", (needs) =>
      (needs ?? []).map((need) => ({ ...need, description: "Van usada" })),
    );

    const again = await store().save(creating());
    expect(again.kind === "landed" && again.pending).toEqual(["needsItems"]);
    await landAsThePage();
    expect((await store().save(savingLanded())).kind).toBe("saved");

    const needs = server.get(ID)!.wire.needsItems as WireNeed[];
    expect(needs).toHaveLength(1);
    expect(needs[0]).toMatchObject({ id: "need-1", description: "Van usada", submittedAt: DAY });
  });

  it("quem não lê o texto livre não duplica a necessidade do projeto sensível", async () => {
    await loseTheFirstAnswer();
    readAs = "other";

    const again = await store().save({ ...creating(), readsHealth: true, writesHealth: true });

    expect(again.kind).toBe("landed");
    if (again.kind !== "landed") return;
    expect(again.pending).toEqual([]);
    expect(again.carried).toEqual({});
  });

  it("se a ficha andou depois da criação, aplicar a diferença é o conflito do servidor, não uma sobrescrita", async () => {
    await loseTheFirstAnswer();
    editedBySomebody({ notes: "texto da Maria" });
    useRecordStore.getState().updateDraft(NEW_RECORD, { notes: "o meu texto" });

    const again = await store().save(creating());
    expect(again.kind === "landed" && again.pending).toEqual(["notes"]);
    await landAsThePage();
    expect(store().record?.version).toBe('"2"');

    const applied = await applyAsThePage();

    expect(applied.kind).toBe("conflict");
    if (applied.kind !== "conflict") return;
    expect(applied.conflict.changedBy).toBe("Maria");
    expect(applied.conflict.changedFields).toEqual(["notes"]);
    expect(writes("patch")[0].headers["If-Match"]).toBe('"1"');
    expect(server.get(ID)!.wire.notes).toBe("texto da Maria");
    expect(drafts()[ID]).toEqual({ notes: "o meu texto" });

    // Visto o conflito, salvar de novo cita a versão relida e passa.
    expect((await applyAsThePage()).kind).toBe("saved");
    expect(server.get(ID)!.wire.notes).toBe("o meu texto");
  });

  it("a versão de criação sobrevive a um envio que caiu e a um recarregamento", async () => {
    await loseTheFirstAnswer();
    editedBySomebody({ notes: "texto da Maria" });
    useRecordStore.getState().updateDraft(NEW_RECORD, { notes: "o meu texto" });
    await store().save(creating());
    await landAsThePage();

    dropNextPatch = true;
    expect((await applyAsThePage()).kind).toBe("failed");
    // Recarregar a página: o store da ficha não guarda nada; o rascunho e a versão a citar, sim.
    flushDraftWrites();
    const kept = JSON.parse(storage.getItem("shema-record-drafts-v1") ?? "{}");
    expect(kept.state.filedAt).toEqual({ [ID]: '"1"' });
    store().forget();
    await store().open(ID);
    const applied = await applyAsThePage();

    expect(applied.kind).toBe("conflict");
    expect(writes("patch").map((config) => config.headers["If-Match"])).toEqual(['"1"', '"1"']);
    expect(server.get(ID)!.wire.notes).toBe("texto da Maria");
    expect(useRecordStore.getState().filedAt[ID]).toBeUndefined();
  });

  it("se a ficha não abre depois do 409, o rascunho fica e o aviso diz que ela existe", async () => {
    await loseTheFirstAnswer();
    const held = server.get(ID)!;
    server.delete(ID);
    // O id continua tomado para o POST, mas a leitura não o alcança (saiu da região).
    const original = http.defaults.adapter;
    http.defaults.adapter = async (config) => {
      if (config.method === "post") {
        sent.push(config);
        return reply(config, 409, { detail: `${ID}: a project already exists at this id`, code: "CONFLICT" });
      }
      return adapter(config);
    };

    const again = await store().save(creating());
    http.defaults.adapter = original;
    server.set(ID, held);

    expect(again.kind).toBe("landedUnread");
    if (again.kind !== "landedUnread") return;
    expect(again.failure.kind).toBe("notFound");
    expect(drafts()[NEW_RECORD]).toMatchObject({ id: ID, languageName: TYPED.languageName });
    expect(useProjectsStore.getState().outdated).toBe(true);
  });
});
