import { describe, expect, it } from "vitest";
import { NOTIF_DEFAULTS } from "../../constants/notifications";
import type { AppNotification, NotificationPrefs } from "../../types/notification";
import type { NeedItem, Project } from "../../types/project";
import {
  applyNotificationPrefs,
  buildNotifications,
  countUnread,
  notificationAge,
  routeNotifications,
  visibleNotifications,
} from "../notifications";
import { makeProject } from "./factory";

const NOW = new Date("2026-08-15T12:00:00");

const need = (overrides: Partial<NeedItem> = {}): NeedItem => ({
  category: "equipment",
  urgency: "high",
  status: "open",
  description: "Um gravador para as sessões de checagem.",
  submittedAt: "2026-08-01",
  ...overrides,
});

const prefs = (overrides: Partial<NotificationPrefs> = {}): NotificationPrefs => ({
  ...NOTIF_DEFAULTS,
  ...overrides,
});

const kinds = (entries: readonly AppNotification[]): string[] =>
  entries.map((entry) => entry.kind);

describe("buildNotifications", () => {
  it("um pedido de oração não autorizado não aparece em notificação nenhuma", () => {
    const withheld = makeProject({
      id: "withheld",
      location: "Peru",
      prayerRequests: "Pedido confiado só à coordenação.",
      prayerRequestsAudio: "data:audio/webm;base64,UklGRg==",
      healthAssessmentDate: "2026-08-10",
    });

    const entries = buildNotifications([withheld], NOW);

    expect(kinds(entries)).toEqual(["health"]);
    expect(JSON.stringify(entries)).not.toContain(
      "Pedido confiado só à coordenação.",
    );
    expect(JSON.stringify(entries)).not.toContain("UklGRg");
  });

  it("o pedido autorizado à rede vira notificação para o intercessor", () => {
    const shared = makeProject({
      id: "shared",
      location: "Brazil",
      team: "JOCUM Belém",
      languageName: "Tikuna",
      prayerRequests: "Orem pelos anciãos que recebem o Evangelho.",
      prayerVisibility: "rede",
      healthAssessmentDate: "2026-08-10",
    });

    const entries = buildNotifications([shared], NOW);
    const prayer = entries.filter((entry) => entry.kind === "prayer");

    expect(prayer).toHaveLength(1);
    expect(prayer[0].text).toBe("Orem pelos anciãos que recebem o Evangelho.");
    expect(prayer[0].audience).toEqual(["resourceCircle"]);
  });

  it("uma necessidade compartilhada mas já respondida não notifica", () => {
    const celebrated = makeProject({
      id: "celebrated",
      location: "Brazil",
      needsItems: [
        need({
          urgency: "low",
          prayerShared: true,
          prayerAnswered: true,
          description: "Agradecemos: o gravador chegou.",
        }),
      ],
    });

    expect(buildNotifications([celebrated], NOW)).toEqual([]);
  });

  it("país sensível não carrega país nem local em nenhuma entrada", () => {
    const sensitive = makeProject({
      id: "sensitive",
      location: "Peru, Cusco",
      sensitiveCountry: true,
      languageName: "Quechua",
      prayerRequests: "Orem pela equipe em revisão.",
      prayerVisibility: "rede",
      healthAssessmentDate: "2026-08-10",
      healthEmotional: "critica",
      needsItems: [need()],
    });

    const entries = buildNotifications([sensitive], NOW);

    expect(entries.length).toBeGreaterThan(0);
    for (const entry of entries) {
      expect(entry.country).toBe("");
      expect(entry.locationWithheld).toBe(true);
      expect(entry.region).toBe("south-america");
    }
    expect(JSON.stringify(entries)).not.toContain("Peru");
    expect(JSON.stringify(entries)).not.toContain("Cusco");
  });

  it("saúde crítica soa urgente; saúde boa, não", () => {
    const critical = makeProject({
      id: "critical",
      location: "Brazil",
      healthAssessmentDate: "2026-08-10",
      healthEmotional: "critica",
    });
    const well = makeProject({
      id: "well",
      location: "Brazil",
      healthAssessmentDate: "2026-08-11",
      healthEmotional: "boa",
      healthRelational: "boa",
      healthSpiritual: "boa",
      healthPhysical: "boa",
    });

    const entries = buildNotifications([critical, well], NOW);

    expect(
      entries.map((entry) => [entry.projectId, entry.urgent]),
    ).toEqual([
      ["well", false],
      ["critical", true],
    ]);
  });

  it("só a necessidade urgente ainda aberta notifica", () => {
    const project = makeProject({
      id: "needs",
      location: "Brazil",
      needsItems: [
        need(),
        need({ status: "fulfilled" }),
        need({ status: "dropped" }),
        need({ urgency: "medium" }),
      ],
    });

    const entries = buildNotifications([project], NOW);

    expect(kinds(entries)).toEqual(["need"]);
    expect(entries[0].urgent).toBe(true);
    expect(entries[0].id).toBe("need:needs:0");
  });

  it("sem notícias há 60+ dias notifica, datado do dia em que o silêncio começou", () => {
    const silent = makeProject({
      id: "silent",
      location: "Brazil",
      progressHistory: [
        {
          date: "2026-01-01",
          translatedUnits: 1,
          communityCheckedUnits: 0,
          approvedUnits: 0,
        },
      ],
    });

    const entries = buildNotifications([silent], NOW);

    expect(kinds(entries)).toEqual(["stale"]);
    expect(entries[0].date).toBe("2026-03-02");
    expect(entries[0].kind === "stale" && entries[0].daysSilent).toBe(226);
  });

  it("quem atualizou há pouco não entra no silêncio", () => {
    const fresh = makeProject({
      id: "fresh",
      location: "Brazil",
      progressHistory: [
        {
          date: "2026-08-01",
          translatedUnits: 1,
          communityCheckedUnits: 0,
          approvedUnits: 0,
        },
      ],
    });

    expect(buildNotifications([fresh], NOW)).toEqual([]);
  });

  it("a chegada de formulário notifica uma vez, pela entrada mais recente com origem", () => {
    const project = makeProject({
      id: "arrivals",
      location: "Brazil",
      progressHistory: [
        {
          date: "2026-07-01",
          translatedUnits: 1,
          communityCheckedUnits: 0,
          approvedUnits: 0,
          fromField: "Antiga",
          formType: "field",
        },
        {
          date: "2026-08-10",
          translatedUnits: 2,
          communityCheckedUnits: 0,
          approvedUnits: 0,
        },
        {
          date: "2026-08-12",
          translatedUnits: 3,
          communityCheckedUnits: 0,
          approvedUnits: 0,
          fromField: "Fresia",
          formType: "field",
        },
      ],
    });

    const entries = buildNotifications([project], NOW);
    const field = entries.filter((entry) => entry.kind === "field");

    expect(field).toHaveLength(1);
    expect(field[0].kind === "field" && field[0].fromField).toBe("Fresia");
    expect(field[0].date).toBe("2026-08-12");
    expect(field[0].urgent).toBe(false);
  });

  it("ordena do mais recente para o mais antigo", () => {
    const entries = buildNotifications(
      [
        makeProject({
          id: "old",
          location: "Brazil",
          healthAssessmentDate: "2026-06-01",
        }),
        makeProject({
          id: "new",
          location: "Brazil",
          healthAssessmentDate: "2026-08-01",
        }),
      ],
      NOW,
    );

    expect(entries.map((entry) => entry.projectId)).toEqual(["new", "old"]);
  });
});

describe("routeNotifications", () => {
  const entries = buildNotifications(
    [
      makeProject({
        id: "south",
        location: "Brazil",
        healthAssessmentDate: "2026-08-10",
        prayerRequests: "Orem pela checagem.",
        prayerVisibility: "rede",
      }),
      makeProject({
        id: "africa",
        location: "Uganda",
        healthAssessmentDate: "2026-08-11",
      }),
    ],
    NOW,
  );

  it("o intercessor recebe o pedido, e só ele", () => {
    const routed = routeNotifications(entries, {
      role: "resourceCircle",
      regions: null,
    });

    expect(kinds(routed)).toEqual(["prayer"]);
  });

  it("o administrador recebe o campo e a saúde, não o pedido", () => {
    const routed = routeNotifications(entries, {
      role: "coordinator",
      regions: null,
    });

    expect(kinds(routed)).toEqual(["health", "health"]);
  });

  it("papel regional só vê a própria região", () => {
    const routed = routeNotifications(entries, {
      role: "coordinator",
      regions: ["south-america"],
    });

    expect(routed.map((entry) => entry.projectId)).toEqual(["south"]);
  });

  it("a estrategista global vê tudo", () => {
    const routed = routeNotifications(entries, {
      role: "globalStrategist",
      regions: null,
    });

    expect(routed).toHaveLength(entries.length);
  });
});

describe("applyNotificationPrefs", () => {
  const entries = buildNotifications(
    [
      makeProject({
        id: "routine",
        location: "Brazil",
        mentor: "Pati & Marcos",
        healthAssessmentDate: "2026-08-10",
        healthEmotional: "boa",
      }),
      makeProject({
        id: "urgent",
        location: "Brazil",
        mentor: "Rodolfo / Debora",
        healthAssessmentDate: "2026-08-11",
        healthEmotional: "critica",
      }),
    ],
    NOW,
  );

  it("desativado, nada chega", () => {
    expect(applyNotificationPrefs(entries, prefs({ enabled: false }), null)).toEqual(
      [],
    );
  });

  it("só os urgentes corta o rotineiro", () => {
    const kept = applyNotificationPrefs(entries, prefs({ when: "urgent" }), null);

    expect(kept.map((entry) => entry.projectId)).toEqual(["urgent"]);
  });

  it("só projetos que mentoro filtra pelo nome, sem inventar quando não há nome", () => {
    const mine = applyNotificationPrefs(
      entries,
      prefs({ scope: "mentored" }),
      "pati",
    );

    expect(mine.map((entry) => entry.projectId)).toEqual(["routine"]);
    expect(
      applyNotificationPrefs(entries, prefs({ scope: "mentored" }), null),
    ).toEqual([]);
  });

  it("lista personalizada entrega só o que foi escolhido", () => {
    const chosen = applyNotificationPrefs(
      entries,
      prefs({ scope: "custom", customProjectIds: ["urgent"] }),
      null,
    );

    expect(chosen.map((entry) => entry.projectId)).toEqual(["urgent"]);
  });
});

describe("visibleNotifications", () => {
  it("corta em 30 por destinatário, depois do roteamento", () => {
    const projects: Project[] = Array.from({ length: 35 }, (_, index) =>
      makeProject({
        id: `p${index}`,
        location: "Brazil",
        healthAssessmentDate: "2026-08-01",
      }),
    );

    const visible = visibleNotifications(
      projects,
      { role: "coordinator", regions: null },
      prefs(),
      null,
      NOW,
    );

    expect(visible).toHaveLength(30);
  });

  it("o corte vem depois do roteamento: o volume de uma região não come a entrada de outra", () => {
    const loud: Project[] = Array.from({ length: 35 }, (_, index) =>
      makeProject({
        id: `sa${index}`,
        location: "Brazil",
        healthAssessmentDate: "2026-08-10",
      }),
    );
    const quiet = makeProject({
      id: "uganda",
      location: "Uganda",
      healthAssessmentDate: "2026-06-01",
    });

    const visible = visibleNotifications(
      [...loud, quiet],
      { role: "coordinator", regions: ["africa"] },
      prefs(),
      null,
      NOW,
    );

    expect(visible.map((entry) => entry.projectId)).toEqual(["uganda"]);
  });
});

describe("countUnread", () => {
  it("conta só o que ainda não foi lido", () => {
    const entries = buildNotifications(
      [
        makeProject({
          id: "a",
          location: "Brazil",
          healthAssessmentDate: "2026-08-10",
        }),
        makeProject({
          id: "b",
          location: "Brazil",
          healthAssessmentDate: "2026-08-11",
        }),
      ],
      NOW,
    );

    expect(countUnread(entries, [])).toBe(2);
    expect(countUnread(entries, [entries[0].id])).toBe(1);
    expect(
      countUnread(
        entries,
        entries.map((entry) => entry.id),
      ),
    ).toBe(0);
  });
});

describe("notificationAge", () => {
  it("lê hoje, ontem, dias e data", () => {
    expect(notificationAge("2026-08-15", NOW)).toEqual({ unit: "today" });
    expect(notificationAge("2026-08-14", NOW)).toEqual({ unit: "yesterday" });
    expect(notificationAge("2026-08-01", NOW)).toEqual({
      unit: "days",
      days: 14,
    });
    expect(notificationAge("2026-07-01", NOW)).toEqual({ unit: "date" });
    expect(notificationAge("", NOW)).toEqual({ unit: "date" });
  });
});
