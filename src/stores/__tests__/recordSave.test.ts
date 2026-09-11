import axios, { type InternalAxiosRequestConfig } from "axios";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The test environment pins `VITE_DATA_SOURCE=fixtures` (vite.config.ts), which is what
 * lets every other suite read the doubles. This suite is about the **wire**: the version
 * guard, the 409 body, a located 422 and a dead connection are things only the real
 * endpoint module produces, so the source is flipped here and nowhere else.
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

const { RECORD_TABS } = await import("../../constants/recordTabs");
const {
  allWritableFields,
  PENDING_WRITE,
  SERVER_WRITABLE,
  TAB_FIELDS,
  tabOf,
} = await import("../../constants/recordFields");
const { http } = await import("../../services/api/client");
const { useProjectRecordStore, changedFields, withheldFields, tabOfFirstError } =
  await import("../projectRecordStore");
const { useRecordStore } = await import("../recordStore");

interface Reply {
  status: number;
  data?: unknown;
  headers?: Record<string, string>;
}

const sent: InternalAxiosRequestConfig[] = [];
let queue: Reply[] = [];

const adapter = async (config: InternalAxiosRequestConfig) => {
  sent.push(config);
  const reply = queue.shift() ?? { status: 500 };
  const response = {
    data: reply.data ?? null,
    status: reply.status,
    statusText: "",
    headers: reply.headers ?? {},
    config,
  };
  const accepted = config.validateStatus
    ? config.validateStatus(reply.status)
    : reply.status >= 200 && reply.status < 300;
  if (accepted) return response;
  throw { code: "ERR_BAD_REQUEST", config, response };
};

http.defaults.adapter = adapter;
axios.defaults.adapter = adapter;

const record = (over: Record<string, unknown> = {}) => ({
  id: "p1",
  languageName: "Asháninka",
  languageCode: "cni",
  bridgeLanguage: "Espanhol",
  vitalityStatus: "",
  location: "Peru",
  location2: null,
  speakerCount: "",
  coords: [0, 0],
  translationType: [],
  financialResources: [],
  team: "JOCUM Aurora",
  ywamBase: "JOCUM Aurora",
  teamLeader: "Fresia",
  teamLeaderContact: null,
  mentor: "Daniel",
  mentorContact: null,
  translators: "",
  technicalReviewers: "",
  partnerOrg: "",
  teamContact: "",
  facilitator: null,
  objective: ["NT"],
  scopeDetails: "",
  objectiveNotes: null,
  portion: null,
  totalUnits: 28,
  totalUnitsType: "Capítulos",
  translatedUnits: 10,
  communityCheckedUnits: 0,
  approvedUnits: 0,
  startDate: null,
  deadline: null,
  lastUpdated: null,
  status: "em-andamento",
  sensitivity: "",
  sensitiveCountry: false,
  statusComments: "",
  statusGoal: "",
  orgRole: "",
  financialNotes: null,
  financialOtherDetails: null,
  storiesTranslated: null,
  readyVesselsAudioHours: null,
  phases: [],
  bookProgress: [],
  storyProgress: [],
  otherProgress: null,
  progressHistory: [],
  healthEmotional: null,
  healthRelational: null,
  healthSpiritual: null,
  healthPhysical: null,
  healthAssessmentDate: null,
  healthAssessor: "",
  healthNotes: "",
  healthHistory: null,
  prayerRequests: "",
  prayerVisibility: null,
  prayerRequestsAudio: null,
  needsPastoralIntervention: "nao",
  pastoralInterventionName: "",
  pastoralInterventionWhen: null,
  needsItems: [],
  needsNotes: "",
  notes: "",
  inETEN: false,
  materials: [],
  mediaPhotos: null,
  mediaVideos: null,
  derived: null,
  ...over,
});

const ok = (over: Record<string, unknown> = {}, version = '"7"'): Reply => ({
  status: 200,
  data: record(over),
  headers: { etag: version },
});

const CONFLICT: Reply = {
  status: 409,
  headers: { etag: '"9"' },
  data: {
    detail: "This record was saved by somebody else.",
    code: "CONFLICT",
    expectedVersion: 7,
    currentVersion: 9,
    changedFields: ["statusComments", "notes"],
    changedBy: "Maria",
    changedAt: "2026-09-11T14:02:00+00:00",
  },
};

/** The screen hands `values` (the merge) and `typed` (the overlay); a patch's draft is
 * both, and a create's typed half is what the coordinator entered. */
const saving = (typed: Record<string, unknown>) => ({
  values: { ...typed } as never,
  typed: { ...typed } as never,
  isNew: false,
});

const creating = (values: never, typed: Record<string, unknown> = {}) => ({
  values,
  typed: typed as never,
  isNew: true,
});

const store = () => useProjectRecordStore.getState();
const drafts = () => useRecordStore.getState().drafts;

async function openAt(version = '"7"') {
  queue = [ok({}, version)];
  store().forget();
  await store().open("p1");
}

beforeEach(() => {
  sent.length = 0;
  queue = [];
  useRecordStore.setState({ drafts: {} });
  store().forget();
});

describe("cada aba escreve só o que é dela", () => {
  it("a partição é exaustiva e disjunta sobre a superfície de escrita", () => {
    const owned = RECORD_TABS.flatMap((tab) => TAB_FIELDS[tab]);
    expect(new Set(owned).size).toBe(owned.length);
    for (const field of allWritableFields()) {
      expect(tabOf(field)).not.toBeNull();
    }
  });

  it("todo campo pendente pertence a uma aba e não é aceito pelo servidor", () => {
    for (const tab of RECORD_TABS) {
      for (const field of PENDING_WRITE[tab]?.fields ?? []) {
        expect(tabOf(field)).toBe(tab);
        expect(SERVER_WRITABLE.has(field)).toBe(false);
      }
    }
  });

  it("o diff carrega o que mudou, e a aba 3 não escreve a aba 7", () => {
    const saved = { ...record(), notes: "antigo" } as never;
    expect(changedFields({ languageName: "Novo" }, saved)).toEqual([
      "languageName",
    ]);
    // `notes` está no rascunho com o mesmo valor salvo: não mudou, não viaja.
    expect(changedFields({ notes: "antigo" }, saved)).toEqual([]);
  });

  it("o que o PATCH ainda não aceita é separado, nunca mandado", () => {
    expect(
      withheldFields({ notes: "x", healthEmotional: "boa", needsItems: [] }),
    ).toEqual(["healthEmotional", "needsItems"]);
  });

  it("o que ficou pendente é o que foi digitado, não o registro inteiro", async () => {
    await openAt();
    // A ficha entrega a visão mesclada (todo campo existe nela) e a camada digitada.
    // Perguntar à mesclada reportaria a lista pendente inteira e prometeria guardar
    // entrada que ninguém escreveu.
    queue = [ok({ notes: "vai" }, '"8"')];
    const outcome = await store().save({
      values: { ...record(), notes: "vai" } as never,
      typed: { notes: "vai" } as never,
      isNew: false,
    });

    expect(outcome.kind).toBe("saved");
    if (outcome.kind !== "saved") return;
    expect(outcome.report.withheld).toEqual([]);
  });
});

describe("abrir a ficha é sempre uma leitura nova", () => {
  it("reabrir o mesmo registro relê, porque a versão em cache é sobre a qual se salva", async () => {
    await openAt('"7"');
    expect(store().record?.version).toBe('"7"');

    queue = [ok({ notes: "alguém mexeu" }, '"9"')];
    await store().open("p1");

    expect(store().record?.version).toBe('"9"');
    expect(store().record?.project.notes).toBe("alguém mexeu");
    expect(sent.filter((config) => config.method === "get")).toHaveLength(2);
  });
});

describe("o conflito avisa e não descarta o que foi digitado", () => {
  it("uma edição concorrente simulada mantém cada tecla e nomeia a sobreposição", async () => {
    await openAt('"7"');
    useRecordStore
      .getState()
      .updateDraft("p1", { notes: "contei 12 capítulos hoje", teamLeader: "Ana" });

    // O 409 e, logo atrás, a releitura: é a outra pessoa tendo salvo no meio.
    queue = [CONFLICT, ok({ notes: "texto da Maria", version: 9 }, '"9"')];
    const outcome = await store().save(saving(drafts().p1));

    expect(outcome.kind).toBe("conflict");
    if (outcome.kind !== "conflict") return;
    expect(outcome.conflict.changedBy).toBe("Maria");
    expect(outcome.conflict.changedFields).toEqual(["statusComments", "notes"]);
    // A sobreposição é a frase que importa: os dois mexeram em `notes`.
    expect(outcome.overlap).toEqual(["notes"]);

    // Nada do rascunho foi tocado.
    expect(drafts().p1).toEqual({
      notes: "contei 12 capítulos hoje",
      teamLeader: "Ana",
    });
    // E o registro por baixo é o atual, para o próximo salvamento citar uma
    // versão que existe.
    expect(store().record?.version).toBe('"9"');
    expect(store().record?.project.notes).toBe("texto da Maria");
  });

  it("não salva de novo sozinho: uma tentativa, uma requisição de escrita", async () => {
    await openAt();
    useRecordStore.getState().updateDraft("p1", { notes: "meu" });
    queue = [CONFLICT, ok({}, '"9"')];
    await store().save(saving(drafts().p1));

    expect(sent.filter((config) => config.method === "patch")).toHaveLength(1);
  });

  it("salvar de novo, depois da releitura, cita a versão nova e passa", async () => {
    await openAt();
    useRecordStore.getState().updateDraft("p1", { notes: "meu" });
    queue = [CONFLICT, ok({}, '"9"')];
    await store().save(saving(drafts().p1));

    queue = [ok({ notes: "meu" }, '"10"')];
    const outcome = await store().save(saving(drafts().p1));

    expect(outcome.kind).toBe("saved");
    const patches = sent.filter((config) => config.method === "patch");
    expect(patches[patches.length - 1].headers["If-Match"]).toBe('"9"');
  });

  it("se a releitura também falhar, o conflito ainda é dito", async () => {
    await openAt();
    useRecordStore.getState().updateDraft("p1", { notes: "meu" });
    queue = [CONFLICT, { status: 500 }];
    const outcome = await store().save(saving(drafts().p1));

    expect(outcome.kind).toBe("conflict");
    expect(drafts().p1).toEqual({ notes: "meu" });
  });
});

describe("queda de rede não custa entrada nenhuma", () => {
  it("o que foi digitado continua no rascunho e pode ser reenviado", async () => {
    await openAt();
    useRecordStore
      .getState()
      .updateDraft("p1", { notes: "três semanas de contagem" });

    queue = [{ status: 0 }];
    const failed = await store().save(saving(drafts().p1));
    expect(failed.kind).toBe("failed");
    expect(drafts().p1).toEqual({ notes: "três semanas de contagem" });

    queue = [ok({ notes: "três semanas de contagem" }, '"8"')];
    const retried = await store().save(saving(drafts().p1));
    expect(retried.kind).toBe("saved");
  });

  it("o rascunho sobrevive ao armazenamento, que é o que sobrevive ao reload", async () => {
    useRecordStore.getState().updateDraft("p1", { notes: "guardado" });
    const { flushDraftWrites } = await import("../recordStore");
    flushDraftWrites();

    const written = storage.getItem("shema-record-drafts-v1");
    expect(written).toContain("guardado");
  });
});

describe("o salvamento aceito esquece só o que o servidor levou", () => {
  it("o que ainda não é gravado no servidor fica onde foi digitado", async () => {
    await openAt();
    useRecordStore.getState().updateDraft("p1", {
      notes: "vai",
      healthEmotional: "boa",
      mediaVideos: [{ url: "https://exemplo/v" }],
    });

    queue = [ok({ notes: "vai" }, '"8"')];
    const outcome = await store().save(saving(drafts().p1));

    expect(outcome.kind).toBe("saved");
    if (outcome.kind !== "saved") return;
    expect(outcome.report.written).toEqual(["notas"]);
    expect(outcome.report.withheld).toEqual(["healthEmotional", "mediaVideos"]);

    useRecordStore.getState().settleDraft("p1", outcome.report.writtenFields);
    expect(drafts().p1).toEqual({
      healthEmotional: "boa",
      mediaVideos: [{ url: "https://exemplo/v" }],
    });
  });

  it("sem nada pendente o rascunho some inteiro", async () => {
    await openAt();
    useRecordStore.getState().updateDraft("p1", { notes: "vai" });
    queue = [ok({ notes: "vai" }, '"8"')];
    const outcome = await store().save(saving(drafts().p1));

    if (outcome.kind !== "saved") throw new Error("esperava salvo");
    useRecordStore.getState().settleDraft("p1", outcome.report.writtenFields);
    expect(drafts().p1).toBeUndefined();
  });

  it("salvar sem mudança nenhuma não manda requisição", async () => {
    await openAt();
    const outcome = await store().save(saving({ notes: "" }));

    expect(outcome.kind).toBe("unchanged");
    expect(sent.filter((config) => config.method === "patch")).toHaveLength(0);
  });
});

describe("o progresso é um lote atômico", () => {
  it("vinte linhas viram uma escrita, com um resultado", async () => {
    await openAt();
    const rows = Array.from({ length: 20 }, (_, index) => ({
      id: "MAT",
      name: `Livro ${index}`,
      chapters: 5,
      translated: index % 5,
      communityChecked: 0,
      mentorApproved: 0,
    }));
    useRecordStore.getState().updateDraft("p1", { bookProgress: rows });

    queue = [ok({ bookProgress: rows }, '"8"')];
    const outcome = await store().save(saving(drafts().p1));

    expect(outcome.kind).toBe("saved");
    const patches = sent.filter((config) => config.method === "patch");
    expect(patches).toHaveLength(1);
    expect(JSON.parse(String(patches[0].data)).bookProgress).toHaveLength(20);
  });

  it("um lote recusado não aplica linha nenhuma, e o rascunho fica inteiro", async () => {
    await openAt();
    const rows = [
      { id: "MAT", name: "Mateus", chapters: 28, translated: 28, communityChecked: 0, mentorApproved: 0 },
      { id: "MRK", name: "Marcos", chapters: 60, translated: 0, communityChecked: 0, mentorApproved: 0 },
    ];
    useRecordStore.getState().updateDraft("p1", { bookProgress: rows });

    queue = [
      {
        status: 422,
        data: {
          detail: [
            {
              loc: ["body", "bookProgress", 1],
              msg: "Value error, MRK: 60 chapters, and the book has 16",
            },
          ],
        },
      },
    ];
    const outcome = await store().save(saving(drafts().p1));

    expect(outcome.kind).toBe("invalid");
    if (outcome.kind !== "invalid") return;
    expect(outcome.errors[0]).toEqual({
      field: "bookProgress",
      index: 1,
      message: "MRK: 60 chapters, and the book has 16",
    });
    // O registro não andou, e as vinte linhas continuam digitadas.
    expect(store().record?.version).toBe('"7"');
    expect(drafts().p1.bookProgress).toHaveLength(2);
  });
});

describe("um registro novo é filed no slug que o cliente cunhou", () => {
  it("o POST leva o id e o dia local de quem salva", async () => {
    queue = [ok({ id: "novo-slug" }, '"1"')];
    const outcome = await store().save(creating({ ...record(), id: "novo-slug" } as never));

    expect(outcome.kind).toBe("saved");
    const post = sent.find((config) => config.method === "post");
    expect(post).toBeDefined();
    expect(JSON.parse(String(post?.data)).id).toBe("novo-slug");
    expect(post?.headers["X-Shema-Local-Date"]).toMatch(/^\d{4}-\d{2}-\d{2}$/u);
    expect(store().id).toBe("novo-slug");
  });

  it("o slug já tomado volta como recusa legível, não como registro criado", async () => {
    queue = [
      {
        status: 409,
        data: {
          detail: "novo-slug: a project already exists at this slug",
          code: "CONFLICT",
        },
      },
    ];
    const outcome = await store().save(creating({ ...record(), id: "novo-slug" } as never));

    expect(outcome.kind).toBe("conflict");
  });

  it("um registro novo guarda só o que foi digitado nas abas pendentes", async () => {
    queue = [ok({ id: "novo-slug" }, '"1"')];
    const outcome = await store().save(
      creating({ ...record(), id: "novo-slug" } as never, {
        languageName: "Nova",
        mediaVideos: [{ url: "https://exemplo/v" }],
      }),
    );

    expect(outcome.kind).toBe("saved");
    if (outcome.kind !== "saved") return;
    expect(outcome.report.withheld).toEqual(["mediaVideos"]);
  });

  it("nenhum campo que o POST não aceita atravessa", async () => {
    queue = [ok({ id: "novo-slug" }, '"1"')];
    await store().save(creating({ ...record(), id: "novo-slug", healthEmotional: "boa" } as never));

    const body = JSON.parse(
      String(sent.find((config) => config.method === "post")?.data),
    );
    expect(body).not.toHaveProperty("healthEmotional");
    expect(body).not.toHaveProperty("ywamBase");
    expect(body).not.toHaveProperty("needsItems");
  });
});

describe("a recusa do servidor cai na aba certa", () => {
  it("uma recusa localizada aponta a aba dona do campo", () => {
    expect(
      tabOfFirstError([
        { field: null, index: null, message: "sem campo" },
        { field: "bookProgress", index: 2, message: "ruim" },
      ]),
    ).toBe("progresso");
    expect(tabOfFirstError([{ field: "languageName", index: null, message: "x" }])).toBe(
      "identidade",
    );
    expect(tabOfFirstError([{ field: null, index: null, message: "x" }])).toBeNull();
  });
});
