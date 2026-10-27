import { describe, expect, it } from "vitest";
import { overallOfEntry, pastoralWhenFor } from "../health";

const entry = (
  over: Partial<{
    emotional: string;
    relational: string;
    spiritual: string;
    physical: string;
  }> = {},
) => ({
  emotional: "",
  relational: "",
  spiritual: "",
  physical: "",
  ...over,
}) as Parameters<typeof overallOfEntry>[0];

describe("overallOfEntry — a mesma regra do getOverallHealth, lida de uma entrada", () => {
  it("uma entrada sem nada avaliado é na, nunca boa por omissão", () => {
    expect(overallOfEntry(entry())).toBe("na");
  });

  it("uma crítica pesa mais que três boas, na entrada como no projeto", () => {
    expect(
      overallOfEntry(
        entry({ emotional: "boa", relational: "boa", spiritual: "boa", physical: "critica" }),
      ),
    ).toBe("critica");
  });

  it("atenção só vence quando não há crítica", () => {
    expect(
      overallOfEntry(entry({ emotional: "atencao", relational: "boa" })),
    ).toBe("atencao");
  });
});

describe("pastoralWhenFor — a caixa da ficha não inventa quando (OBT-628)", () => {
  it("marcar sim por cima de um não salvo começa sem quando", () => {
    for (const stale of ["now", "30d"]) {
      expect(
        pastoralWhenFor(
          { needsPastoralIntervention: "nao", pastoralInterventionWhen: stale },
          "sim",
        ),
        stale,
      ).toBe("");
    }
  });

  it("desmarcar devolve o quando salvo, e remarcar um sim salvo o mantém", () => {
    const saved = {
      needsPastoralIntervention: "sim" as const,
      pastoralInterventionWhen: "30d",
    };
    expect(pastoralWhenFor(saved, "nao")).toBe("30d");
    expect(pastoralWhenFor(saved, "sim")).toBe("30d");
  });

  it("um registro novo marca sim sem quando", () => {
    expect(pastoralWhenFor(undefined, "sim")).toBe("");
    expect(pastoralWhenFor(undefined, "nao")).toBeUndefined();
  });
});
