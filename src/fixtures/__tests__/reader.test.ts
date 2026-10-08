import { describe, expect, it } from "vitest";
import type { SessionPersona } from "../../contexts/session";
import { REGION_CENTROIDS } from "../../constants/geo";
import { makeProject } from "../../utils/__tests__/factory";
import { asReadBy, coordinatesAnything, readerOf, readsTruthAnywhere, withhold } from "../reader";

const persona = (
  roles: SessionPersona["roles"],
  regionScope: SessionPersona["regionScope"],
): SessionPersona => ({ id: "p", role: roles[0], roles, regionScope });

describe("readerOf espelha o _scope.readership do servidor (OBT-528)", () => {
  const cases: [string, SessionPersona, "coordination" | "trusted" | "other"][] = [
    ["admin (hipótese da 528), em qualquer região", persona(["admin"], null), "coordination"],
    ["coordinator na própria região", persona(["coordinator"], ["africa"]), "coordination"],
    ["coordinator fora da própria região", persona(["coordinator"], ["asia"]), "other"],
    ["coordinator com escopo global (null)", persona(["coordinator"], null), "coordination"],
    ["coordinator + obtLab na região da conta", persona(["coordinator", "obtLab"], ["africa"]), "coordination"],
    ["obtLab, mesmo na própria região", persona(["obtLab"], ["africa"]), "other"],
    ["resourceCircle, em qualquer região (OBT-571)", persona(["resourceCircle"], ["africa"]), "trusted"],
    ["resourceCircle fora da própria região", persona(["resourceCircle"], ["asia"]), "trusted"],
  ];

  it.each(cases)("%s", (_name, who, expected) => {
    expect(readerOf(who, "africa")).toBe(expected);
  });

  it("a verdade da coleção vai a quem coordena alguma região e ao Círculo (OBT-571), não ao OBT Lab", () => {
    expect(readsTruthAnywhere(persona(["resourceCircle"], ["africa"]))).toBe(true);
    expect(readsTruthAnywhere(persona(["coordinator"], ["asia"]))).toBe(true);
    expect(readsTruthAnywhere(persona(["obtLab"], ["africa"]))).toBe(false);
    expect(readsTruthAnywhere(persona(["coordinator"], []))).toBe(false);
  });

  it("o aviso da coleção vai a quem coordena alguma região, e a ninguém mais", () => {
    expect(coordinatesAnything(persona(["admin"], null))).toBe(true);
    expect(coordinatesAnything(persona(["coordinator"], ["asia"]))).toBe(true);
    expect(coordinatesAnything(persona(["coordinator"], []))).toBe(false);
    expect(coordinatesAnything(persona(["obtLab"], ["africa"]))).toBe(false);
  });
});

describe("a redução do dublê é a do LeavingShape", () => {
  const sensitive = makeProject({
    location: "Peru, Vila Sintética",
    location2: "Vale Sintético",
    team: "Base Sintética",
    ywamBase: "Base Sintética",
    teamContact: "contato",
    teamLeaderContact: "líder",
    mentorContact: "mentor",
    sensitivity: "motivo",
    coords: [-70.1, -9.9],
    sensitiveCountry: true,
  });

  it("chave da região no local, centróide nas coordenadas e nada de base, contatos ou motivo", () => {
    const reduced = withhold(sensitive);
    expect(reduced).toMatchObject({
      location: "south-america",
      location2: "",
      team: "",
      ywamBase: "",
      teamContact: "",
      teamLeaderContact: "",
      mentorContact: "",
      sensitivity: "",
      coords: REGION_CENTROIDS["south-america"],
    });
  });

  it("carimba o leitor, e só reduz o sensível lido como other", () => {
    const other = persona(["obtLab"], ["africa"]);
    expect(asReadBy(sensitive, other)).toMatchObject({ readAs: "other", team: "" });
    expect(asReadBy({ ...sensitive, sensitiveCountry: false }, other)).toMatchObject({
      readAs: "other",
      team: "Base Sintética",
    });
    expect(asReadBy(sensitive, persona(["admin"], null))).toMatchObject({
      readAs: "coordination",
      team: "Base Sintética",
    });
  });
});
