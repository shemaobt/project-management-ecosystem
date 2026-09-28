import { afterAll, describe, expect, it } from "vitest";
import { createEmptyProject } from "../../fixtures/blank";
import type { ReceivedSubmission } from "../../types/forms";
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

/** A Pulse that arrived and was archived — the only thing that counts as returned (FE-49). */
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

const NONE: readonly ReceivedSubmission[] = [];

const PULSE = formOf("pulso");
const HEALTH = formOf("health");

describe("os dois instrumentos leem sinais diferentes, em ritmos diferentes", () => {
  it("o Pulso é mensal e lê o que chegou, não a atualização do projeto", () => {
    expect(PULSE.cadence).toBe("monthly");
    expect(reportingFor(PULSE, project(), [returned("kadiweu", "2026-05-02")], NOW).state).toBe(
      "reported",
    );
    expect(reportingFor(PULSE, project(), [returned("kadiweu", "2026-04-30")], NOW).state).toBe(
      "awaiting",
    );
  });

  /**
   * GATE-02 (OBT-388) fez do Pulso Mensal um formulário cujo registro é o que chega. Ler
   * `lastUpdated` contava qualquer edição da ficha como *a equipe devolveu*.
   */
  it("atualizar a ficha não conta como Pulso devolvido", () => {
    const edited = project({ lastUpdated: "2026-05-13" });

    expect(reportingFor(PULSE, edited, NONE, NOW).state).toBe("never");
  });

  it("o Pulso de outro projeto não conta para este", () => {
    expect(reportingFor(PULSE, project(), [returned("outro", "2026-05-02")], NOW).state).toBe(
      "never",
    );
  });

  it("a Avaliação é trimestral e lê a data da avaliação", () => {
    expect(HEALTH.cadence).toBe("quarterly");
    expect(reportingFor(HEALTH, assessed("2026-04-01"), NONE, NOW).state).toBe(
      "reported",
    );
    expect(reportingFor(HEALTH, assessed("2026-03-31"), NONE, NOW).state).toBe(
      "awaiting",
    );
  });

  it("um Pulso recente não faz a avaliação do trimestre existir", () => {
    const fresh = [returned("kadiweu", "2026-05-13")];

    expect(reportingFor(PULSE, project(), fresh, NOW).state).toBe("reported");
    expect(reportingFor(HEALTH, project(), fresh, NOW).state).toBe("never");
  });
});

describe("nunca avaliado não se confunde com atrasado", () => {
  it("uma data de avaliação sem nenhuma dimensão preenchida não conta", () => {
    const undated = project({ healthAssessmentDate: "2026-04-01" });

    expect(reportingFor(HEALTH, undated, NONE, NOW).state).toBe("never");
    expect(reportingFor(HEALTH, undated, NONE, NOW).lastDate).toBeNull();
  });

  it("avaliado num trimestre anterior fica atrasado, com a data à vista", () => {
    const old = reportingFor(HEALTH, assessed("2025-11-20"), NONE, NOW);

    expect(old.state).toBe("awaiting");
    expect(old.lastDate).toBe("2025-11-20");
  });

  it("uma data ilegível não vira registro", () => {
    expect(reportingFor(PULSE, project(), [returned("kadiweu", "14/05/2026")], NOW).state).toBe(
      "never",
    );
  });
});

describe("o período que a tela mostra é o do calendário, não o do fuso de quem abre", () => {
  it("o mês do Pulso fecha no último dia do mês", () => {
    expect(reportingFor(PULSE, project(), NONE, NOW).periodEnd).toBe("2026-05-31");
  });

  it("o trimestre da Avaliação fecha no último dia do trimestre", () => {
    expect(reportingFor(HEALTH, project(), NONE, NOW).periodEnd).toBe("2026-06-30");
  });
});

describe("quem está calado há mais tempo aparece primeiro", () => {
  const projects = [
    project({ id: "recente", languageName: "Recente" }),
    project({ id: "nunca", languageName: "Nunca" }),
    project({ id: "antigo", languageName: "Antigo" }),
    project({ id: "reportou", languageName: "Reportou" }),
  ];
  const archive = [
    returned("recente", "2026-04-28"),
    returned("antigo", "2025-09-01"),
    returned("antigo", "2025-06-01"),
    returned("reportou", "2026-05-10"),
  ];

  it("sem registro vem antes de todo mundo, depois do mais antigo ao mais novo", () => {
    const { pending } = formReadiness(PULSE, projects, archive, NOW);

    expect(pending.map((entry) => entry.id)).toEqual([
      "nunca",
      "antigo",
      "recente",
    ]);
  });

  it("quem reportou sai da lista e entra na contagem", () => {
    const readiness = formReadiness(PULSE, projects, archive, NOW);

    expect(readiness.reported).toBe(1);
    expect(readiness.total).toBe(4);
    expect(readiness.reported + readiness.pending.length).toBe(readiness.total);
  });

  it("a data à vista é a do Pulso mais recente que chegou", () => {
    const { pending } = formReadiness(PULSE, projects, archive, NOW);

    expect(pending.find((entry) => entry.id === "antigo")?.lastDate).toBe("2025-09-01");
  });

  it("cada pendente carrega o continente, que é o que a coordenação usa para agir", () => {
    const { pending } = formReadiness(PULSE, projects, archive, NOW);

    expect(pending[0].regionLabelKey).toBe("continent_south_america");
  });
});

describe("o Ritmo e os Formulários não podem discordar sobre quem reportou", () => {
  const projects = [
    project({ id: "a" }),
    project({ id: "b" }),
    assessed("2026-04-02", { id: "c" }),
    project({ id: "d", lastUpdated: "2026-05-12" }),
  ];
  const archive = [returned("a", "2026-05-10"), returned("b", "2026-01-02")];

  it("a contagem do Pulso bate com a do indicador do Ritmo", () => {
    const hub = formReadiness(PULSE, projects, archive, NOW);
    const ritmo = meetingReadiness("pulso", "monthly", projects, "global", archive, NOW);

    expect(ritmo).not.toBeNull();
    expect(hub.reported).toBe(ritmo?.ready);
    expect(hub.total).toBe(ritmo?.total);
  });

  it("a contagem da Avaliação bate com a do indicador do Ritmo", () => {
    const hub = formReadiness(HEALTH, projects, archive, NOW);
    const ritmo = meetingReadiness(
      "health",
      "quarterly",
      projects,
      "global",
      archive,
      NOW,
    );

    expect(hub.reported).toBe(ritmo?.ready);
    expect(hub.total).toBe(ritmo?.total);
  });

  it("ninguém pendente aqui aparece como pronto lá", () => {
    const { pending } = formReadiness(PULSE, projects, archive, NOW);

    expect(pending.length).toBeGreaterThan(0);
    for (const entry of pending) {
      const only = projects.filter((candidate) => candidate.id === entry.id);
      expect(meetingReadiness("pulso", "monthly", only, "global", archive, NOW)).toEqual({
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
