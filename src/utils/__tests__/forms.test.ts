import { afterAll, describe, expect, it } from "vitest";
import { createEmptyProject } from "../../fixtures/blank";
import type { Project } from "../../types/project";
import { formOf, formReadiness, reportingFor, selectableProjects } from "../forms";
import { meetingReadiness } from "../rhythm";

const originalTz = process.env.TZ;
process.env.TZ = "America/Sao_Paulo";

afterAll(() => {
  process.env.TZ = originalTz;
});

const NOW = new Date(2026, 4, 14);

const project = (over: Partial<Project> = {}): Project => ({
  ...createEmptyProject("kadiweu"),
  languageName: "Kadiwéu",
  location: "Brazil",
  ...over,
});

const assessed = (date: string, over: Partial<Project> = {}): Project =>
  project({ healthAssessmentDate: date, healthEmotional: "boa", ...over });

const PULSE = formOf("pulso");
const HEALTH = formOf("health");

describe("os dois instrumentos leem sinais diferentes, em ritmos diferentes", () => {
  it("o Pulso é mensal e lê a atualização do projeto", () => {
    expect(PULSE.cadence).toBe("monthly");
    expect(reportingFor(PULSE, project({ lastUpdated: "2026-05-02" }), NOW).state).toBe(
      "reported",
    );
    expect(reportingFor(PULSE, project({ lastUpdated: "2026-04-30" }), NOW).state).toBe(
      "awaiting",
    );
  });

  it("a Avaliação é trimestral e lê a data da avaliação", () => {
    expect(HEALTH.cadence).toBe("quarterly");
    expect(reportingFor(HEALTH, assessed("2026-04-01"), NOW).state).toBe(
      "reported",
    );
    expect(reportingFor(HEALTH, assessed("2026-03-31"), NOW).state).toBe(
      "awaiting",
    );
  });

  it("uma atualização recente não faz a avaliação do trimestre existir", () => {
    const fresh = project({ lastUpdated: "2026-05-13" });

    expect(reportingFor(PULSE, fresh, NOW).state).toBe("reported");
    expect(reportingFor(HEALTH, fresh, NOW).state).toBe("never");
  });
});

describe("nunca avaliado não se confunde com atrasado", () => {
  it("uma data de avaliação sem nenhuma dimensão preenchida não conta", () => {
    const undated = project({ healthAssessmentDate: "2026-04-01" });

    expect(reportingFor(HEALTH, undated, NOW).state).toBe("never");
    expect(reportingFor(HEALTH, undated, NOW).lastDate).toBeNull();
  });

  it("avaliado num trimestre anterior fica atrasado, com a data à vista", () => {
    const old = reportingFor(HEALTH, assessed("2025-11-20"), NOW);

    expect(old.state).toBe("awaiting");
    expect(old.lastDate).toBe("2025-11-20");
  });

  it("uma data ilegível não vira registro", () => {
    expect(reportingFor(PULSE, project({ lastUpdated: "14/05/2026" }), NOW).state).toBe(
      "never",
    );
  });
});

describe("o período que a tela mostra é o do calendário, não o do fuso de quem abre", () => {
  it("o mês do Pulso fecha no último dia do mês", () => {
    expect(reportingFor(PULSE, project(), NOW).periodEnd).toBe("2026-05-31");
  });

  it("o trimestre da Avaliação fecha no último dia do trimestre", () => {
    expect(reportingFor(HEALTH, project(), NOW).periodEnd).toBe("2026-06-30");
  });
});

describe("quem está calado há mais tempo aparece primeiro", () => {
  const projects = [
    project({ id: "recente", languageName: "Recente", lastUpdated: "2026-04-28" }),
    project({ id: "nunca", languageName: "Nunca", lastUpdated: "" }),
    project({ id: "antigo", languageName: "Antigo", lastUpdated: "2025-09-01" }),
    project({ id: "reportou", languageName: "Reportou", lastUpdated: "2026-05-10" }),
  ];

  it("sem registro vem antes de todo mundo, depois do mais antigo ao mais novo", () => {
    const { pending } = formReadiness(PULSE, projects, NOW);

    expect(pending.map((entry) => entry.id)).toEqual([
      "nunca",
      "antigo",
      "recente",
    ]);
  });

  it("quem reportou sai da lista e entra na contagem", () => {
    const readiness = formReadiness(PULSE, projects, NOW);

    expect(readiness.reported).toBe(1);
    expect(readiness.total).toBe(4);
    expect(readiness.reported + readiness.pending.length).toBe(readiness.total);
  });

  it("cada pendente carrega o continente, que é o que a coordenação usa para agir", () => {
    const { pending } = formReadiness(PULSE, projects, NOW);

    expect(pending[0].regionLabelKey).toBe("continent_south_america");
  });
});

describe("o Ritmo e os Formulários não podem discordar sobre quem reportou", () => {
  const projects = [
    project({ id: "a", lastUpdated: "2026-05-10" }),
    project({ id: "b", lastUpdated: "2026-01-02" }),
    assessed("2026-04-02", { id: "c", lastUpdated: "" }),
    project({ id: "d", lastUpdated: "" }),
  ];

  it("a contagem do Pulso bate com a do indicador do Ritmo", () => {
    const hub = formReadiness(PULSE, projects, NOW);
    const ritmo = meetingReadiness("pulso", "monthly", projects, "global", NOW);

    expect(ritmo).not.toBeNull();
    expect(hub.reported).toBe(ritmo?.ready);
    expect(hub.total).toBe(ritmo?.total);
  });

  it("a contagem da Avaliação bate com a do indicador do Ritmo", () => {
    const hub = formReadiness(HEALTH, projects, NOW);
    const ritmo = meetingReadiness(
      "health",
      "quarterly",
      projects,
      "global",
      NOW,
    );

    expect(hub.reported).toBe(ritmo?.ready);
    expect(hub.total).toBe(ritmo?.total);
  });

  it("ninguém pendente aqui aparece como pronto lá", () => {
    const { pending } = formReadiness(PULSE, projects, NOW);

    expect(pending.length).toBeGreaterThan(0);
    for (const entry of pending) {
      const only = projects.filter((candidate) => candidate.id === entry.id);
      expect(meetingReadiness("pulso", "monthly", only, "global", NOW)).toEqual({
        ready: 0,
        total: 1,
      });
    }
  });
});

describe("a lista do seletor é estável e não mexe na coleção do dono", () => {
  it("ordena por idioma sem reordenar o array recebido", () => {
    const original = [
      project({ id: "b", languageName: "Zapoteco" }),
      project({ id: "a", languageName: "Asháninka" }),
    ];
    const sorted = selectableProjects(original);

    expect(sorted.map((entry) => entry.languageName)).toEqual([
      "Asháninka",
      "Zapoteco",
    ]);
    expect(original[0].languageName).toBe("Zapoteco");
  });
});
