import { describe, expect, it } from "vitest";
import { ROLE_BODY } from "../../constants/team";
import type { Region } from "../../types/region";
import {
  applyChanges,
  diffTeams,
  draftsFor,
  lastChangeFor,
  summarize,
  unassignedCount,
} from "../team";

const NOW = new Date(2026, 4, 14);

const regions = (): Region[] => [
  {
    key: "south-america",
    labelKey: "continent_south_america",
    team: { coordinator: "Ana", obtLab: "", resourceCircle: "Lucas" },
  },
  {
    key: "africa",
    labelKey: "continent_africa",
    team: { coordinator: "", obtLab: "", resourceCircle: "" },
  },
];

describe("o rascunho parte do que está salvo, sem mexer nele", () => {
  it("copia os times sem compartilhar referência", () => {
    const source = regions();
    const drafts = draftsFor(source);
    drafts["south-america"].coordinator = "Outra";

    expect(source[0].team.coordinator).toBe("Ana");
  });

  it("uma região sem ninguém vem com os três campos vazios", () => {
    expect(draftsFor(regions())["africa"]).toEqual({
      coordinator: "",
      obtLab: "",
      resourceCircle: "",
    });
  });
});

describe("só o que mudou vira evento", () => {
  it("campo intocado não gera registro", () => {
    const source = regions();
    expect(diffTeams(source, draftsFor(source), "Karina", NOW)).toEqual([]);
  });

  it("espaço em branco a mais não é mudança", () => {
    const source = regions();
    const drafts = draftsFor(source);
    drafts["south-america"].coordinator = "  Ana  ";

    expect(diffTeams(source, drafts, "Karina", NOW)).toEqual([]);
  });

  it("o evento carrega o antes, o depois, quem e quando", () => {
    const source = regions();
    const drafts = draftsFor(source);
    drafts["africa"].obtLab = "Grace Achieng";

    expect(diffTeams(source, drafts, "Karina", NOW)).toEqual([
      {
        regionKey: "africa",
        role: "obtLab",
        from: "",
        to: "Grace Achieng",
        changedBy: "Karina",
        changedAt: "2026-05-14",
      },
    ]);
  });
});

describe("aplicar as mudanças não corrompe o que não mudou", () => {
  it("mexe só na região e no papel do evento", () => {
    const source = regions();
    const drafts = draftsFor(source);
    drafts["africa"].coordinator = "Josué";
    const next = applyChanges(source, diffTeams(source, drafts, "K", NOW));

    expect(next[1].team.coordinator).toBe("Josué");
    expect(next[0].team).toEqual(source[0].team);
  });

  it("sem evento nenhum, devolve as regiões como estavam", () => {
    const source = regions();
    expect(applyChanges(source, [])).toEqual(source);
  });
});

describe("o resumo do salvamento conta o que a tela vai afirmar", () => {
  it("separa preenchido de esvaziado", () => {
    const source = regions();
    const drafts = draftsFor(source);
    drafts["africa"].coordinator = "Josué";
    drafts["south-america"].resourceCircle = "";

    expect(summarize(diffTeams(source, drafts, "K", NOW))).toEqual({
      changed: 2,
      filled: 1,
      cleared: 1,
    });
  });
});

describe("papel sem responsável é estado, não falha de render", () => {
  it("conta os vazios das duas regiões", () => {
    expect(unassignedCount(regions())).toBe(4);
  });

  it("nome só de espaços conta como vazio", () => {
    const source = regions();
    source[0].team.obtLab = "   ";
    expect(unassignedCount(source)).toBe(4);
  });
});

describe("a última troca de um papel é a que a tela mostra", () => {
  it("devolve a mais recente, não a primeira", () => {
    const source = regions();
    const first = diffTeams(
      source,
      { ...draftsFor(source), africa: { coordinator: "A", obtLab: "", resourceCircle: "" } },
      "K",
      NOW,
    );
    const after = applyChanges(source, first);
    const second = diffTeams(
      after,
      { ...draftsFor(after), africa: { coordinator: "B", obtLab: "", resourceCircle: "" } },
      "K",
      NOW,
    );

    expect(
      lastChangeFor([...first, ...second], "africa", "coordinator")?.to,
    ).toBe("B");
  });

  it("papel sem troca nenhuma não inventa registro", () => {
    expect(lastChangeFor([], "africa", "obtLab")).toBeNull();
  });
});

describe("cada papel de região é parceria com uma mesa diferente", () => {
  it("as três origens não se repetem — é organograma, não cadeia", () => {
    const bodies = Object.values(ROLE_BODY);
    expect(new Set(bodies).size).toBe(bodies.length);
  });
});
