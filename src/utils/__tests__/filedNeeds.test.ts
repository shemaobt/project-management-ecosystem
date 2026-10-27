import { describe, expect, it } from "vitest";
import type { NeedItem } from "../../types/project";
import { isFiledNeed, reconcileFiledNeeds } from "../needs";

const need = (over: Partial<NeedItem> = {}): NeedItem => ({
  category: "financial",
  urgency: "low",
  status: "open",
  description: "",
  ...over,
});

/** The row as the server answers it after a create: id, the day stamped, empty text as `""`. */
const filed = (typed: NeedItem, over: Partial<NeedItem> = {}): NeedItem => ({
  ...typed,
  id: "n-1",
  estimatedValue: "",
  estimatedAmount: typed.estimatedAmount ? Number(typed.estimatedAmount).toFixed(2) : "",
  estimatedCurrency: typed.estimatedCurrency ? typed.estimatedCurrency.toUpperCase() : "",
  deadline: "",
  fulfilledBy: "",
  fulfilledDate: "",
  droppedDate: "",
  submittedBy: "",
  submittedAt: typed.submittedAt || "2026-10-26",
  acknowledgedAt: typed.acknowledged ? "2026-10-26" : "",
  acknowledgedBy: typed.acknowledged ? "Carla Coordenadora" : "",
  ...over,
});

describe("o eco da necessidade que a criação gravou (OBT-625)", () => {
  const van = need({ description: "Van", estimatedAmount: "1500", estimatedCurrency: "brl" });

  it("casa apesar do id, do dia carimbado, das duas casas e da moeda em maiúsculas", () => {
    expect(isFiledNeed(van, filed(van), true)).toBe(true);
  });

  it("o visto pedido casa só com o visto carimbado, e o salvo visto não exige o pedido", () => {
    const seen = need({ description: "Van", acknowledged: true });
    expect(isFiledNeed(seen, filed(seen), true)).toBe(true);
    expect(isFiledNeed(seen, filed(seen, { acknowledgedAt: "" }), true)).toBe(false);
    expect(isFiledNeed(van, filed(van, { acknowledgedAt: "2026-10-26" }), true)).toBe(true);
  });

  it("descrição, categoria, valor ou dia digitado mudados não casam", () => {
    expect(isFiledNeed({ ...van, description: "Van usada" }, filed(van), true)).toBe(false);
    expect(isFiledNeed({ ...van, category: "equipment" }, filed(van), true)).toBe(false);
    expect(isFiledNeed({ ...van, estimatedAmount: "1600" }, filed(van), true)).toBe(false);
    const dated = need({ submittedAt: "2026-10-01" });
    expect(isFiledNeed(dated, filed(dated, { submittedAt: "2026-10-26" }), true)).toBe(false);
  });

  it("quem recebe o texto livre vazio não compara descrições", () => {
    expect(isFiledNeed(van, filed(van, { description: "" }), false)).toBe(true);
    expect(isFiledNeed(van, filed(van, { description: "" }), true)).toBe(false);
  });
});

describe("o que o rascunho ainda carrega para a ficha gravada (OBT-625)", () => {
  const van = need({ description: "Van" });
  const recorder = need({ category: "equipment", description: "Gravador" });
  const savedVan = filed(van, { id: "n-van" });
  const savedRecorder = filed(recorder, { id: "n-rec" });

  it("nada, quando toda necessidade digitada já está lá", () => {
    expect(reconcileFiledNeeds([van, recorder], [savedRecorder, savedVan], true)).toBeNull();
  });

  it("a acrescentada depois do envio entra como nova, ao lado das salvas", () => {
    const radio = need({ category: "equipment", description: "Rádio" });
    expect(
      reconcileFiledNeeds([van, recorder, radio], [savedVan, savedRecorder], true),
    ).toEqual([savedVan, savedRecorder, radio]);
  });

  it("a editada depois do envio volta com o id da salva, para ser atualizada no lugar", () => {
    const carried = reconcileFiledNeeds(
      [{ ...van, description: "Van usada" }, recorder],
      [savedVan, savedRecorder],
      true,
    );
    expect(carried).toHaveLength(2);
    expect(carried?.[0]).toMatchObject({ id: "n-van", description: "Van usada", submittedAt: "2026-10-26" });
    expect(carried?.filter((item) => !item.id)).toEqual([]);
  });

  it("duas sobras na mesma categoria não se pareiam: vão como novas", () => {
    const other = need({ description: "Combustível" });
    const savedOther = filed(other, { id: "n-fuel" });
    const carried = reconcileFiledNeeds(
      [{ ...van, description: "Van usada" }, { ...other, description: "Diesel" }],
      [savedVan, savedOther],
      true,
    );
    expect(carried?.slice(0, 2)).toEqual([savedVan, savedOther]);
    expect(carried?.slice(2).map((item) => item.id)).toEqual([undefined, undefined]);
  });

  it("a tirada do rascunho não volta como nova nem pede escrita", () => {
    expect(reconcileFiledNeeds([van], [savedVan, savedRecorder], true)).toBeNull();
  });
});
