import { describe, expect, it } from "vitest";
import { RITMO_MEETINGS } from "../../constants/meetings";
import { EMPTY_REGION_TEAM, REGIONS } from "../../constants/regions";
import type { ReceivedSubmission } from "../../types/forms";
import type { MeetingLogEntry } from "../../types/meeting";
import type { Region, RegionTeam } from "../../types/region";
import { formatIsoDate } from "../cadence";
import {
  meetingReadiness,
  meetingStatus,
  nextOccurrence,
  resolveMeetingParticipants,
  rhythmScopes,
  scopesFor,
} from "../rhythm";
import { makeProject } from "./factory";

const MAY = new Date(2026, 4, 14);

/**
 * `meetingStatus` and `nextOccurrence` read only the id and the cadence, so these pair a real
 * id with each cadence to exercise the rule — the set's own cadences are pinned in
 * `ritmoRender.test.ts` and `fixtures.test.ts`.
 */
const monthly = { id: "bimestral_pi_campo", cadence: "monthly" } as const;
const quarterly = { id: "trimestral_pi_pontes", cadence: "quarterly" } as const;
const annual = { id: "semestral_member_care", cadence: "annual" } as const;

const returned = (projectId: string, receivedAt: string): ReceivedSubmission => ({
  id: `${projectId}-${receivedAt}`,
  kind: "pulso",
  projectId,
  languageName: "",
  submittedBy: "",
  receivedAt,
  definitionVersion: 1,
  appliedAt: null,
});

const entry = (
  overrides: Partial<MeetingLogEntry> & Pick<MeetingLogEntry, "period" | "date">,
): MeetingLogEntry => ({
  meetingId: "bimestral_pi_campo",
  scopeKey: "oceania",
  notes: "",
  ...overrides,
});

const regionsWith = (
  key: Region["key"],
  team: Partial<RegionTeam>,
): Region[] =>
  REGIONS.map((region) => ({
    ...region,
    team:
      region.key === key
        ? { ...EMPTY_REGION_TEAM, ...team }
        : { ...EMPTY_REGION_TEAM },
  }));

describe("o estado de uma reunião sai do que já foi registrado", () => {
  it("sem nenhum registro, está a iniciar e não tem última", () => {
    const status = meetingStatus([], monthly, "oceania", MAY);
    expect(status).toEqual({ state: "new", date: null });
  });

  it("registrada no período corrente, está em dia", () => {
    const log = [entry({ period: "2026-05", date: "2026-05-04" })];
    expect(meetingStatus(log, monthly, "oceania", MAY)).toEqual({
      state: "done",
      date: "2026-05-04",
    });
  });

  it("registrada só no período anterior, está a fazer", () => {
    const log = [entry({ period: "2026-04", date: "2026-04-20" })];
    expect(meetingStatus(log, monthly, "oceania", MAY)).toEqual({
      state: "pending",
      date: "2026-04-20",
    });
  });

  it("com um buraco antes do período anterior, está atrasada", () => {
    const log = [entry({ period: "2026-02", date: "2026-02-10" })];
    expect(meetingStatus(log, monthly, "oceania", MAY)).toEqual({
      state: "overdue",
      date: "2026-02-10",
    });
  });

  it("a última é a data mais recente, mesmo registrada fora de ordem", () => {
    const log = [
      entry({ period: "2026-02", date: "2026-02-10" }),
      entry({ period: "2026-03", date: "2026-03-30" }),
      entry({ period: "2026-01", date: "2026-01-05" }),
    ];
    expect(meetingStatus(log, monthly, "oceania", MAY).date).toBe("2026-03-30");
  });

  it("o registro de uma região não conta para outra", () => {
    const log = [entry({ period: "2026-05", date: "2026-05-04" })];
    expect(meetingStatus(log, monthly, "africa", MAY).state).toBe("new");
  });

  it("o registro de uma reunião não conta para outra", () => {
    const log = [
      entry({ meetingId: "trimestral_pi_pontes", period: "2026-05", date: "2026-05-04" }),
    ];
    expect(meetingStatus(log, monthly, "oceania", MAY).state).toBe("new");
  });

  it("o trimestral lê trimestres, não meses", () => {
    const log = [
      entry({ meetingId: "trimestral_pi_pontes", period: "2026-Q2", date: "2026-04-02" }),
    ];
    expect(meetingStatus(log, quarterly, "oceania", MAY)).toEqual({
      state: "done",
      date: "2026-04-02",
    });
  });
});

describe("registrar recalcula a próxima ocorrência", () => {
  it("enquanto não foi feita, a próxima é o fim do período corrente", () => {
    const status = meetingStatus([], monthly, "oceania", MAY);
    expect(formatIsoDate(nextOccurrence(monthly, status, MAY))).toBe(
      "2026-05-31",
    );
  });

  it("feita neste período, a próxima passa para o fim do período seguinte", () => {
    const log = [entry({ period: "2026-05", date: "2026-05-04" })];
    const status = meetingStatus(log, monthly, "oceania", MAY);
    expect(formatIsoDate(nextOccurrence(monthly, status, MAY))).toBe(
      "2026-06-30",
    );
  });

  it("o trimestral feito em T2 aponta para o fim de T3", () => {
    const log = [
      entry({ meetingId: "trimestral_pi_pontes", period: "2026-Q2", date: "2026-04-02" }),
    ];
    const status = meetingStatus(log, quarterly, "oceania", MAY);
    expect(formatIsoDate(nextOccurrence(quarterly, status, MAY))).toBe(
      "2026-09-30",
    );
  });

  it("o anual feito em 2026 aponta para 31 de dezembro de 2027", () => {
    const log = [
      entry({
        meetingId: "semestral_member_care",
        scopeKey: "global",
        period: "2026",
        date: "2026-03-01",
      }),
    ];
    const status = meetingStatus(log, annual, "global", MAY);
    expect(formatIsoDate(nextOccurrence(annual, status, MAY))).toBe(
      "2027-12-31",
    );
  });
});

describe("o que alimenta a reunião é contagem viva, não legenda", () => {
  const reported = makeProject({ id: "reported", location: "Fiji" });
  const silent = makeProject({
    id: "silent",
    location: "Fiji",
    lastUpdated: "2026-05-10",
  });
  const elsewhere = makeProject({ id: "elsewhere", location: "Uganda" });
  const archive = [
    returned("reported", "2026-05-02"),
    returned("silent", "2026-03-02"),
    returned("elsewhere", "2026-05-02"),
  ];

  it("conta quem devolveu o Pulso no período contra o total da região", () => {
    expect(
      meetingReadiness("pulso", "monthly", [reported, silent, elsewhere], "oceania", archive, MAY),
    ).toEqual({ ready: 1, total: 2 });
  });

  it("atualizar a ficha não é devolver o Pulso", () => {
    expect(
      meetingReadiness("pulso", "monthly", [silent], "oceania", [], MAY),
    ).toEqual({ ready: 0, total: 1 });
  });

  it("uma região sem projetos não recebe contagem nenhuma", () => {
    expect(
      meetingReadiness("pulso", "monthly", [reported], "europe", archive, MAY),
    ).toBeNull();
  });

  it("o escopo global conta o ecossistema inteiro", () => {
    expect(
      meetingReadiness("pulso", "monthly", [reported, silent, elsewhere], "global", archive, MAY),
    ).toEqual({ ready: 2, total: 3 });
  });

  it("uma data de avaliação sem nota nenhuma não conta como escutada", () => {
    const dated = makeProject({
      id: "dated",
      location: "Fiji",
      healthAssessmentDate: "2026-04-10",
    });
    expect(
      meetingReadiness("health", "quarterly", [dated], "oceania", [], MAY),
    ).toEqual({ ready: 0, total: 1 });
  });

  it("com nota registrada no trimestre, conta", () => {
    const assessed = makeProject({
      id: "assessed",
      location: "Fiji",
      healthAssessmentDate: "2026-04-10",
      healthEmotional: "boa",
    });
    expect(
      meetingReadiness("health", "quarterly", [assessed], "oceania", [], MAY),
    ).toEqual({ ready: 1, total: 1 });
  });

  it("a nota do trimestre passado não conta neste", () => {
    const stale = makeProject({
      id: "stale",
      location: "Fiji",
      healthAssessmentDate: "2026-02-10",
      healthEmotional: "boa",
    });
    expect(
      meetingReadiness("health", "quarterly", [stale], "oceania", [], MAY),
    ).toEqual({ ready: 0, total: 1 });
  });
});

describe("quem participa vem do organograma, por referência", () => {
  const meeting = RITMO_MEETINGS.find((item) => item.id === "trimestral_pi_pontes");

  it("a reunião regional traz o Operacional de Línguas da região", () => {
    if (!meeting) throw new Error("trimestral_pi_pontes");
    const before = resolveMeetingParticipants(
      meeting,
      "oceania",
      regionsWith("oceania", { obtLab: "Ana Ribeiro" }),
    );
    expect(before.find((person) => person.key === "obtLab")?.holder).toBe(
      "Ana Ribeiro",
    );

    const after = resolveMeetingParticipants(
      meeting,
      "oceania",
      regionsWith("oceania", { obtLab: "Marcos Pinho" }),
    );
    expect(after.find((person) => person.key === "obtLab")?.holder).toBe(
      "Marcos Pinho",
    );
  });

  it("cada região lê o titular dela, não o da vizinha", () => {
    if (!meeting) throw new Error("trimestral_pi_pontes");
    const regions = regionsWith("oceania", { obtLab: "Ana Ribeiro" });
    expect(
      resolveMeetingParticipants(meeting, "africa", regions).find(
        (person) => person.key === "obtLab",
      )?.holder,
    ).toBeNull();
  });

  it("sem ninguém no organograma, o titular fica vazio em vez de inventado", () => {
    if (!meeting) throw new Error("trimestral_pi_pontes");
    const roles = resolveMeetingParticipants(meeting, "oceania", []);
    expect(roles.every((person) => person.holder === null)).toBe(true);
  });

  it("quem não é papel do organograma não recebe nome", () => {
    if (!meeting) throw new Error("trimestral_pi_pontes");
    const roles = resolveMeetingParticipants(
      meeting,
      "oceania",
      regionsWith("oceania", { obtLab: "Ana Ribeiro" }),
    );
    const team = roles.find((person) => person.key === "internationalProjects");
    expect(team?.fromOrgChart).toBe(false);
    expect(team?.holder).toBeNull();
  });

  it("o escopo global não tem organograma regional para ler", () => {
    if (!meeting) throw new Error("trimestral_pi_pontes");
    const roles = resolveMeetingParticipants(
      meeting,
      "global",
      regionsWith("oceania", { obtLab: "Ana Ribeiro" }),
    );
    expect(roles.every((person) => person.holder === null)).toBe(true);
  });
});

describe("as linhas de uma reunião seguem as regiões que têm projetos", () => {
  const projects = [
    makeProject({ id: "a", location: "Fiji" }),
    makeProject({ id: "b", location: "Fiji" }),
    makeProject({ id: "c", location: "Uganda" }),
  ];

  it("ordena por quantidade e traz a contagem de cada uma", () => {
    expect(rhythmScopes(projects)).toEqual([
      { key: "oceania", labelKey: "continent_oceania", count: 2 },
      { key: "africa", labelKey: "continent_africa", count: 1 },
    ]);
  });

  it("uma região sem projeto nenhum não vira linha", () => {
    expect(rhythmScopes(projects).some((scope) => scope.key === "europe")).toBe(
      false,
    );
  });

  it("nenhum projeto fica de fora da soma das linhas", () => {
    const total = rhythmScopes(projects).reduce(
      (sum, scope) => sum + scope.count,
      0,
    );
    expect(total).toBe(projects.length);
  });

  it("um projeto sem localização ainda entra em alguma linha", () => {
    const scopes = rhythmScopes([makeProject({ id: "d", location: "" })]);
    expect(scopes).toHaveLength(1);
    expect(scopes[0].count).toBe(1);
  });

  it("a reunião global tem uma linha só, com o ecossistema inteiro", () => {
    expect(
      scopesFor({ scope: "global" }, projects, "ritmo_all_ecosystem"),
    ).toEqual([
      { key: "global", labelKey: "ritmo_all_ecosystem", count: 3 },
    ]);
  });

  it("sem projeto nenhum, uma reunião regional não tem linha", () => {
    expect(scopesFor({ scope: "region" }, [], "ritmo_all_ecosystem")).toEqual([]);
  });
});
