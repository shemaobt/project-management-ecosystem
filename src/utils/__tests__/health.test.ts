import { describe, expect, it } from "vitest";
import { overallOfEntry } from "../health";

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
