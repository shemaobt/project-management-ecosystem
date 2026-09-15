import axios, { type InternalAxiosRequestConfig } from "axios";
import { describe, expect, it } from "vitest";
import { allWritableFields } from "../../../constants/recordFields";

const { http } = await import("../client");
const { projectRecordAPI, readConflict, readFieldErrors, toWire } =
  await import("../projectRecord");
const { toApiFailure } = await import("../errors");
const { historyDeltas } = await import("../../../utils/progress");

interface Reply {
  status: number;
  data?: unknown;
  headers?: Record<string, string>;
}

let script: (config: InternalAxiosRequestConfig) => Reply;
let lastConfig: InternalAxiosRequestConfig | null = null;

/**
 * Axios settles on `validateStatus` **after** the adapter answers, so a double that
 * throws on every non-2xx would hide exactly the behaviour under test: 409 and 422 are
 * answers this module reads off the response, not transport failures.
 */
const adapter = async (config: InternalAxiosRequestConfig) => {
  lastConfig = config;
  const reply = script(config);
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

const WIRE = {
  id: "ashaninka",
  languageName: "Asháninka",
  languageCode: "cni",
  bridgeLanguage: "Espanhol",
  vitalityStatus: "vigorosa",
  location: "Peru",
  location2: null,
  speakerCount: "97000",
  coords: [-74.5, -11.2] as [number, number],
  translationType: ["OBT"],
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
  totalUnits: 260,
  totalUnitsType: "Capítulos",
  translatedUnits: 28,
  communityCheckedUnits: 10,
  approvedUnits: 4,
  startDate: "2024-04-13",
  deadline: null,
  lastUpdated: "2026-05-02",
  status: null,
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
  bookProgress: [
    {
      id: "MAT",
      name: "Mateus",
      chapters: 28,
      translated: 28,
      communityChecked: 10,
      mentorApproved: 4,
    },
  ],
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
  needsPastoralIntervention: "nao" as const,
  pastoralInterventionName: "",
  pastoralInterventionWhen: null,
  needsItems: [],
  needsNotes: "",
  notes: "",
  inETEN: false,
  materials: [],
  mediaPhotos: null,
  mediaVideos: null,
  derived: {
    status: "em-andamento" as const,
    health: "na" as const,
    stale: "atencao" as const,
    progress: 10.77,
    priority: "default" as const,
    healthScore: 0,
    daysSinceUpdate: 72,
    lastProgressUpdate: "2026-05-02",
    region: "south-america" as const,
  },
};

describe("a leitura do registro", () => {
  it("traz a ficha inteira e a versão que o próximo salvamento cita", async () => {
    script = () => ({ status: 200, data: WIRE, headers: { etag: '"7"' } });
    const loaded = await projectRecordAPI.read("ashaninka");

    expect(loaded.version).toBe('"7"');
    expect(loaded.project.languageName).toBe("Asháninka");
    expect(loaded.project.coords).toEqual([-74.5, -11.2]);
    expect(loaded.project.bookProgress[0].mentorApproved).toBe(4);
  });

  it("o bloco derived do servidor chega inteiro, sem recálculo", async () => {
    script = () => ({ status: 200, data: WIRE, headers: { etag: '"1"' } });
    const { project } = await projectRecordAPI.read("ashaninka");
    expect(project.derived).toEqual(WIRE.derived);
  });

  it("nulo do servidor vira a palavra do registro para nada, nunca undefined", async () => {
    script = () => ({ status: 200, data: WIRE, headers: { etag: '"1"' } });
    const { project } = await projectRecordAPI.read("ashaninka");

    expect(project.deadline).toBe("");
    expect(project.healthEmotional).toBe("");
    expect(project.otherProgress).toEqual([]);
    expect(project.mediaPhotos).toEqual([]);
    // Status armazenado ausente é `desconhecido` — é o que `statusOptionsFor` oferece
    // como quarto cartão, e é o que mantém a volta possível.
    expect(project.status).toBe("desconhecido");
  });

  it("o trilho volta com ausência, não com null — a conta do delta depende disso", async () => {
    script = () => ({
      status: 200,
      headers: { etag: '"1"' },
      data: {
        ...WIRE,
        progressHistory: [
          {
            date: "2026-05-02",
            translatedUnits: 28,
            communityCheckedUnits: 10,
            approvedUnits: 4,
            totalUnits: null,
            bookProgress: null,
            storyProgress: null,
            otherProgress: null,
            previousTranslated: null,
            previousCommunity: null,
            previousApproved: null,
            initial: true,
            synthetic: false,
            fromField: null,
            formType: null,
          },
        ],
      },
    });
    const { project } = await projectRecordAPI.read("ashaninka");
    const entry = project.progressHistory[0];

    // `historyDeltas` pergunta `!== undefined`; um `null` passaria nesse teste e
    // renderia a contagem inteira como avanço.
    expect(entry.previousTranslated).toBeUndefined();
    expect(entry.totalUnits).toBeUndefined();
    expect(entry.bookProgress).toBeUndefined();
    expect(entry.fromField).toBeUndefined();
    expect(historyDeltas(entry)).toEqual({
      translated: 0,
      community: 0,
      approved: 0,
    });
  });

  it("a linha de história guarda ausência nos quatro opcionais", async () => {
    script = () => ({
      status: 200,
      headers: { etag: '"1"' },
      data: {
        ...WIRE,
        storyProgress: [
          {
            name: "A criação",
            audioHours: null,
            recordLocation: null,
            recordStatus: null,
            aiAssisted: null,
          },
        ],
      },
    });
    const { project } = await projectRecordAPI.read("ashaninka");
    expect(project.storyProgress[0]).toEqual({
      name: "A criação",
      audioHours: undefined,
      recordLocation: undefined,
      recordStatus: undefined,
      aiAssisted: undefined,
    });
  });

  it("uma ficha que não existe chega como falha do cliente compartilhado", async () => {
    script = () => ({ status: 404, data: { detail: "não existe" } });
    await expect(projectRecordAPI.read("fantasma")).rejects.toMatchObject({
      kind: "notFound",
    });
  });

  it("a história de saúde traz author, questionSetVersion e overall — não só as quatro notas", async () => {
    script = () => ({
      status: 200,
      headers: { etag: '"1"' },
      data: {
        ...WIRE,
        healthHistory: [
          {
            date: "2026-05-01",
            assessor: "Fresia",
            emotional: "boa",
            relational: "atencao",
            spiritual: null,
            physical: null,
            notes: "Emocional: bem",
            dimensionNotes: { emotional: "bem" },
            author: "Ana Coordenadora",
            questionSetVersion: 1,
            overall: "atencao",
          },
          {
            date: "2025-11-03",
            assessor: "Fresia",
            emotional: "boa",
            relational: "boa",
            spiritual: "boa",
            physical: "boa",
            notes: "",
            dimensionNotes: null,
            author: null,
            questionSetVersion: null,
            overall: null,
          },
        ],
      },
    });
    const { project } = await projectRecordAPI.read("ashaninka");

    expect(project.healthHistory?.[0]).toMatchObject({
      author: "Ana Coordenadora",
      questionSetVersion: 1,
      overall: "atencao",
    });
    // Uma entrada pré-BE-07 respondeu a nenhum questionário — `null` vira ausência,
    // nunca `undefined` silencioso para `questionSetVersion` (que a `null` continua).
    expect(project.healthHistory?.[1].author).toBeUndefined();
    expect(project.healthHistory?.[1].questionSetVersion).toBeNull();
    expect(project.healthHistory?.[1].overall).toBeUndefined();
  });
});

describe("o que sai pela escrita", () => {
  it("manda só os campos nomeados, e nada mais", () => {
    const body = toWire(
      { languageName: "Asháninka", notes: "x", team: "JOCUM" },
      ["languageName"],
    );
    expect(body).toEqual({ languageName: "Asháninka" });
  });

  it("data vazia vira null, porque a palavra da coluna para sem dia é NULL", () => {
    expect(toWire({ deadline: "", startDate: "2024-04-13" }, ["deadline", "startDate"]))
      .toEqual({ deadline: null, startDate: "2024-04-13" });
  });

  it("ywamBase nunca viaja: o servidor serve os dois de uma coluna só", () => {
    const body = toWire({ team: "JOCUM Aurora", ywamBase: "JOCUM Aurora" }, [
      "team",
      "ywamBase",
    ]);
    expect(body).toEqual({ team: "JOCUM Aurora" });
  });

  it("campo ausente é ausente — o corpo não inventa chave", () => {
    expect(toWire({}, ["languageName", "notes"])).toEqual({});
  });

  it("nenhum campo fora do que o PATCH aceita atravessa", () => {
    // `needsItems` entrou no PATCH com a INT-05, quando a BE-08 ganhou a escrita em
    // lote; `healthEmotional` e `mediaPhotos` seguem tendo endpoint próprio.
    const body = toWire(
      { healthEmotional: "boa", needsItems: [], mediaPhotos: [], notes: "ok" },
      allWritableFields().concat([
        "healthEmotional",
        "needsItems",
        "mediaPhotos",
      ]),
    );
    expect(Object.keys(body).sort()).toEqual(["needsItems", "notes"]);
  });

  it("o PATCH cita a versão lida e carimba o dia local de quem salva", async () => {
    script = () => ({ status: 200, data: WIRE, headers: { etag: '"8"' } });
    await projectRecordAPI.patch("ashaninka", { notes: "ok" }, '"7"');

    expect(lastConfig?.method).toBe("patch");
    expect(lastConfig?.headers["If-Match"]).toBe('"7"');
    expect(lastConfig?.headers["X-Shema-Local-Date"]).toMatch(
      /^\d{4}-\d{2}-\d{2}$/u,
    );
  });

  it("a resposta é o registro recalculado, com a nova versão", async () => {
    script = () => ({
      status: 200,
      data: { ...WIRE, translatedUnits: 40 },
      headers: { etag: '"8"' },
    });
    const result = await projectRecordAPI.patch("a", { notes: "ok" }, '"7"');

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.record.version).toBe('"8"');
    expect(result.record.project.translatedUnits).toBe(40);
  });
});

describe("o conflito volta com o que a tela precisa para explicar", () => {
  const BODY = {
    detail: "This record was saved by somebody else.",
    code: "CONFLICT",
    expectedVersion: 7,
    currentVersion: 9,
    changedFields: ["statusComments", "translatedUnits", "latitude", "longitude"],
    changedBy: "Maria",
    changedAt: "2026-09-11T14:02:00+00:00",
  };

  it("não é erro de transporte: é resposta, e volta lida", async () => {
    script = () => ({ status: 409, data: BODY, headers: { etag: '"9"' } });
    const result = await projectRecordAPI.patch("a", { notes: "x" }, '"7"');

    expect(result).toMatchObject({ ok: false, reason: "conflict" });
    if (result.ok || result.reason !== "conflict") return;
    expect(result.conflict.currentVersion).toBe(9);
    expect(result.conflict.changedBy).toBe("Maria");
    expect(result.conflict.changedAt).toBe("2026-09-11");
  });

  it("latitude e longitude são duas colunas e um campo só da ficha", () => {
    const conflict = readConflict(BODY);
    expect(conflict.changedFields).toEqual([
      "statusComments",
      "translatedUnits",
      "coords",
    ]);
  });

  it("chave que este painel não conhece é mostrada, nunca descartada", () => {
    const conflict = readConflict({ ...BODY, changedFields: ["sourceOfTruth"] });
    expect(conflict.changedFields).toEqual([]);
    expect(conflict.unknownFields).toEqual(["sourceOfTruth"]);
  });

  it("um 409 sem corpo ainda diz que a ficha andou", () => {
    const conflict = readConflict(null);
    expect(conflict.changedFields).toEqual([]);
    expect(conflict.changedBy).toBe("");
    expect(conflict.currentVersion).toBeNull();
  });
});

describe("a recusa do servidor aponta para o campo", () => {
  it("cada linha ruim do lote é nomeada de uma vez, pela posição", () => {
    const errors = readFieldErrors({
      detail: [
        {
          loc: ["body", "bookProgress", 0, "chapters"],
          msg: "Value error, MAT: 60 chapters, and the book has 28",
        },
        {
          loc: ["body", "bookProgress", 3],
          msg: "Value error, more than the row's own scope: translated 9 of 5",
        },
      ],
    });

    expect(errors).toEqual([
      {
        field: "bookProgress",
        index: 0,
        message: "MAT: 60 chapters, and the book has 28",
      },
      {
        field: "bookProgress",
        index: 3,
        message: "more than the row's own scope: translated 9 of 5",
      },
    ]);
  });

  it("um lote recusado não aplica nada: a resposta não traz registro", async () => {
    script = () => ({
      status: 422,
      data: {
        detail: [
          { loc: ["body", "bookProgress", 1], msg: "Value error, ruim" },
        ],
      },
    });
    const result = await projectRecordAPI.patch(
      "a",
      { bookProgress: [] },
      '"7"',
    );

    expect(result).toMatchObject({ ok: false, reason: "invalid" });
    expect(result).not.toHaveProperty("record");
  });

  it("a recusa de regra do repositório é uma frase, sem campo", () => {
    expect(
      readFieldErrors({
        detail: "deadline 2024-01-01 is before the start date 2024-04-13",
        code: "BAD_REQUEST",
      }),
    ).toEqual([
      {
        field: null,
        index: null,
        message: "deadline 2024-01-01 is before the start date 2024-04-13",
      },
    ]);
  });

  it("o 400 do repositório também é resposta, não queda de rede", async () => {
    script = () => ({
      status: 400,
      data: { detail: "If-Match: '*' is not a version", code: "BAD_REQUEST" },
    });
    const result = await projectRecordAPI.patch("a", { notes: "x" }, "*");

    expect(result).toMatchObject({ ok: false, reason: "invalid" });
    if (result.ok || result.reason !== "invalid") return;
    expect(result.errors[0].message).toContain("If-Match");
  });
});

describe("a rede caindo é uma quarta resposta, não uma exceção solta", () => {
  it("o salvamento volta como falha de transporte, legível", async () => {
    script = () => {
      // A INT-01 passou a exigir `isAxiosError` para ler ausência de resposta como
      // rede — sem isso um Error solto é `unexpected`. Mesmo dublê de errors.test.ts.
      throw { isAxiosError: true, code: "ECONNABORTED", config: {} };
    };
    const result = await projectRecordAPI.patch("a", { notes: "x" }, '"7"');

    expect(result).toMatchObject({ ok: false, reason: "failed" });
    if (result.ok || result.reason !== "failed") return;
    expect(["timeout", "offline"]).toContain(result.failure.kind);
    expect(toApiFailure(result.failure)).toBe(result.failure);
  });
});
