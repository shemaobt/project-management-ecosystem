import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

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
const { RECORD_TABS } = await import("../../../../constants/recordTabs");
const { PENDING_WRITE } = await import("../../../../constants/recordFields");
const { mapRecord } = await import("../../../../services/api/projectRecord");
const { TAB_COMPONENTS } = await import("../tabs");
const { PendingWriteNote } = await import("../PendingWriteNote");
const { SaveOutcomeNote } = await import("../SaveOutcomeNote");
const { savedSentence } = await import("../saveReport");
const { AuthProvider } = await import("../../../../contexts/AuthContext");

/** One wire record carrying something visible for every one of the ten tabs. */
const WIRE = {
  id: "ashaninka",
  languageName: "Asháninka",
  languageCode: "cni",
  bridgeLanguage: "Espanhol",
  vitalityStatus: "vigorosa",
  location: "Peru",
  location2: "Junín",
  speakerCount: "97000",
  coords: [-74.5, -11.2] as [number, number],
  translationType: ["OBT"],
  financialResources: ["Seed Company"],
  team: "JOCUM Aurora",
  ywamBase: "JOCUM Aurora",
  teamLeader: "Fresia",
  teamLeaderContact: "+51 999",
  mentor: "Daniel",
  mentorContact: null,
  translators: "Pati & Marcos",
  technicalReviewers: "Rodolfo / Debora",
  partnerOrg: "Wycliffe",
  teamContact: "aurora@exemplo",
  facilitator: null,
  objective: ["NT"],
  scopeDetails: "Novo Testamento inteiro",
  objectiveNotes: "Começar por Mateus",
  portion: null,
  totalUnits: 28,
  totalUnitsType: "Capítulos",
  translatedUnits: 28,
  communityCheckedUnits: 10,
  approvedUnits: 4,
  startDate: "2024-04-13",
  deadline: null,
  lastUpdated: "2026-05-02",
  status: "em-andamento" as const,
  sensitivity: "",
  sensitiveCountry: false,
  statusComments: "",
  statusGoal: "",
  orgRole: "",
  financialNotes: "Aporte anual confirmado",
  financialOtherDetails: null,
  storiesTranslated: null,
  readyVesselsAudioHours: null,
  phases: [{ label: "Fase 1", scope: "Mateus", date: "2º semestre" }],
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
  healthEmotional: "atencao" as const,
  healthRelational: "boa" as const,
  healthSpiritual: "boa" as const,
  healthPhysical: null,
  healthAssessmentDate: "2026-05-14",
  healthAssessor: "Coordenação regional",
  healthNotes: "A equipe pediu uma pausa.",
  healthHistory: null,
  prayerRequests: "",
  prayerVisibility: null,
  prayerRequestsAudio: null,
  needsPastoralIntervention: "nao" as const,
  pastoralInterventionName: "",
  pastoralInterventionWhen: null,
  needsItems: [
    {
      id: "n1",
      category: "equipment",
      urgency: "high" as const,
      status: "open" as const,
      description: "Um gravador para o campo",
      estimatedValue: null,
      deadline: null,
      prayerShared: false,
      prayerAnswered: false,
      fulfilledBy: null,
      fulfilledDate: null,
      droppedDate: null,
      submittedBy: null,
      submittedAt: null,
    },
  ],
  needsNotes: "",
  notes: "Fase 2 travada — aguardando revisor.",
  inETEN: true,
  materials: [
    {
      id: "m1",
      kind: "audio" as const,
      scope: "Mateus 1–5",
      fileName: "mateus.mp3",
      fileSize: 1024,
      link: null,
      format: "audio/mpeg",
      durationSeconds: 300,
      authorization: null,
    },
  ],
  mediaPhotos: [{ image: null, caption: "Equipe em Junín", authorization: null }],
  mediaVideos: [
    { url: "https://exemplo/v", caption: null, authorization: null },
  ],
  derived: {
    status: "em-andamento" as const,
    health: "atencao" as const,
    stale: "em-dia" as const,
    progress: 100,
    priority: "default" as const,
    healthScore: 2,
    daysSinceUpdate: 4,
    lastProgressUpdate: "2026-05-02",
    region: "south-america" as const,
  },
};

const project = mapRecord(WIRE);

const noop = () => {};

const handle = {
  values: project,
  saved: project,
  isNew: false,
  hasChanges: false,
  missing: [],
  errors: [],
  errorsFor: () => [],
  set: noop,
  update: noop,
  discard: noop,
};

// Two tabs reach outside themselves: Equipe links to the org chart, Mídia stamps the
// session's name into an authorization (§5.3's one correct stored copy). Both providers
// are what the app gives them, so the render matches the screen.
const renderTab = (tab: (typeof RECORD_TABS)[number], mode: "ver" | "editar") =>
  renderToStaticMarkup(
    createElement(
      MemoryRouter,
      null,
      createElement(
        AuthProvider,
        null,
        createElement(TAB_COMPONENTS[tab], { mode, draft: handle }),
      ),
    ),
  );

describe("as dez abas leem o registro que veio do servidor", () => {
  const EXPECTED: Record<(typeof RECORD_TABS)[number], string> = {
    identidade: "Asháninka",
    equipe: "Pati &amp; Marcos",
    objetivo: "Começar por Mateus",
    recursos: "Seed Company",
    progresso: "Mateus",
    saude: "A equipe pediu uma pausa.",
    necessidades: "Um gravador para o campo",
    midia: "Equipe em Junín",
    notas: "Fase 2 travada — aguardando revisor.",
    materiais: "Mateus 1–5",
  };

  for (const tab of RECORD_TABS) {
    it(`${tab} mostra o que o servidor mandou`, () => {
      expect(renderTab(tab, "ver")).toContain(EXPECTED[tab]);
    });
  }

  it("uma etapa datada com uma frase chega como frase, nunca como Invalid Date", () => {
    const markup = renderTab("objetivo", "ver");
    expect(markup).toContain("2º semestre");
    expect(markup).not.toContain("Invalid Date");
  });

  it("o aviso de progresso é a leitura do servidor, não uma conta local", () => {
    const markup = renderTab("progresso", "ver");
    // `derived.stale` é `em-dia`, então nenhum aviso de silêncio aparece — mesmo com
    // `lastUpdated` de maio, que uma conta local leria como atrasado hoje.
    expect(markup).not.toContain(i18n.t("stale_crit_title"));
    expect(markup).not.toContain(i18n.t("stale_warn_title"));
    expect(markup).toContain(i18n.t("project_status_active"));
  });
});

describe("a aba diz antes de alguém digitar o que ainda não é gravado", () => {
  it("as quatro abas com metade pendente carregam o aviso", () => {
    for (const tab of RECORD_TABS) {
      const pending = PENDING_WRITE[tab];
      const markup = renderTab(tab, "editar");
      if (pending) {
        expect(markup).toContain(i18n.t("record_pending_title"));
        expect(markup).toContain(i18n.t(pending.noteKey));
      } else {
        expect(markup).not.toContain(i18n.t("record_pending_title"));
      }
    }
  });

  it("em modo leitura o aviso não aparece: não há nada sendo digitado", () => {
    expect(renderTab("midia", "ver")).not.toContain(
      i18n.t("record_pending_title"),
    );
  });

  it("o aviso é vazio para uma aba sem pendência, sem caixa solta", () => {
    expect(
      renderToStaticMarkup(createElement(PendingWriteNote, { tab: "notas" })),
    ).toBe("");
  });
});

const outcomeMarkup = (outcome: Parameters<typeof SaveOutcomeNote>[0]["outcome"]) =>
  renderToStaticMarkup(
    createElement(SaveOutcomeNote, {
      outcome,
      saving: false,
      onRetry: noop,
      onGoToTab: noop,
    }),
  );

describe("o conflito é explicado, e diz que nada foi descartado", () => {
  const CONFLICT = {
    kind: "conflict" as const,
    conflict: {
      expectedVersion: 7,
      currentVersion: 9,
      changedFields: ["statusComments", "notes"] as never,
      unknownFields: ["sourceOfTruth"],
      changedBy: "Maria",
      changedAt: "2026-09-11",
      detail: null,
    },
    overlap: ["notes"] as never,
  };

  it("nomeia quem salvou, o que mudou e a sobreposição", () => {
    const markup = outcomeMarkup(CONFLICT);
    expect(markup).toContain(i18n.t("record_conflict_title"));
    expect(markup).toContain(i18n.t("record_conflict_kept"));
    expect(markup).toContain("Maria");
    expect(markup).toContain("sourceOfTruth");
    expect(markup).toContain(i18n.t("record_save_retry"));
  });

  it("sem sobreposição a frase muda, e continua sendo uma decisão da pessoa", () => {
    const markup = outcomeMarkup({ ...CONFLICT, overlap: [] });
    expect(markup).toContain(i18n.t("record_conflict_no_overlap"));
    expect(markup).not.toContain(i18n.t("record_conflict_overlap", { fields: "" }));
  });

  it("um 409 sem autor nem campos ainda diz que a ficha andou", () => {
    const markup = outcomeMarkup({
      kind: "conflict",
      conflict: {
        expectedVersion: null,
        currentVersion: null,
        changedFields: [],
        unknownFields: [],
        changedBy: "",
        changedAt: null,
        detail: null,
      },
      overlap: [],
    });
    expect(markup).toContain(i18n.t("record_conflict_by_unnamed"));
    expect(markup).toContain(i18n.t("record_conflict_changed_unknown"));
  });
});

describe("a recusa e a queda de rede dizem a mesma promessa", () => {
  it("cada linha recusada do lote é nomeada, e nada foi aplicado", () => {
    const markup = outcomeMarkup({
      kind: "invalid",
      errors: [
        { field: "bookProgress", index: 1, message: "MRK: 60 de 16" },
        { field: null, index: null, message: "deadline antes do início" },
      ],
    });
    expect(markup).toContain(i18n.t("record_invalid_nothing"));
    expect(markup).toContain(i18n.t("record_invalid_row", { n: 2 }));
    expect(markup).toContain("MRK: 60 de 16");
    expect(markup).toContain(i18n.t("record_invalid_unlocated"));
  });

  it("a rede caindo oferece tentar de novo e diz onde o digitado ficou", () => {
    const markup = outcomeMarkup({
      kind: "failed",
      failure: { kind: "offline", status: null, code: null, detail: null },
    });
    expect(markup).toContain(i18n.t("record_save_failed"));
    expect(markup).toContain(i18n.t("record_save_retry"));
  });

  it("um salvamento aceito não abre painel nenhum", () => {
    expect(
      outcomeMarkup({
        kind: "saved",
        report: { written: ["notas"], writtenFields: ["notes"], withheld: [] },
      }),
    ).toBe("");
  });
});

describe("a frase do salvamento separa o que foi gravado do que ficou aqui", () => {
  const t = (key: string, params?: Record<string, unknown>) =>
    i18n.t(key, params ?? {});

  it("nomeia as abas gravadas e as que continuam só neste navegador", () => {
    const sentence = savedSentence(
      ["notas"],
      ["healthEmotional", "mediaVideos"],
      t,
    );
    expect(sentence).toContain(i18n.t("sec_notes"));
    expect(sentence).toContain(i18n.t("sec_health"));
    expect(sentence).toContain(i18n.t("sec_media"));
  });

  it("sem nada pendente, a frase não promete guardar coisa nenhuma", () => {
    const sentence = savedSentence(["notas"], [], t);
    expect(sentence).not.toContain(i18n.t("record_saved_withheld", { tabs: "" }));
  });
});
