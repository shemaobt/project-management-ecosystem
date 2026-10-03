import { describe, expect, it } from "vitest";
import { createEmptyProject } from "../../fixtures/blank";
import type { Project } from "../../types/project";
import { mayWrite, recordAccess } from "../recordAccess";
import { getLanguageNameDisplay } from "../region";

/**
 * OBT-560. A sensitive project's language name can name the place (*Sa'di of High Egypt*).
 * Karina, via Daniel, 1/out/2026: a public name coordination registers. Ours: while none is,
 * the server sends the region key, and the screen says it in words.
 */
const t = (key: string, options?: Record<string, string>) =>
  options ? `${key}(${Object.values(options).join(",")})` : key;

function project(over: Partial<Project>): Project {
  return { ...createEmptyProject("p-1"), ...over };
}

describe("o nome da língua na tela", () => {
  it("um nome que não foi retido é o nome", () => {
    expect(getLanguageNameDisplay({ languageName: "Guarani" }, t)).toBe("Guarani");
  });

  it("o nome público chega pronto e é mostrado como chegou", () => {
    const shown = getLanguageNameDisplay(
      { languageName: "Sa'di", languageNameWithheld: true },
      t,
    );
    expect(shown).toBe("Sa'di");
  });

  it("sem nome público, a chave da região vira frase e nunca aparece crua", () => {
    const shown = getLanguageNameDisplay(
      { languageName: "africa", languageNameWithheld: true },
      t,
    );
    expect(shown).toMatch(/^sensitive_project_named\(/);
    expect(shown).not.toBe("africa");
  });
});

describe("quem escreve o nome", () => {
  const sensitive = project({ sensitiveCountry: true, readAs: "other" });
  const coordination = project({ sensitiveCountry: true, readAs: "coordination" });

  it("o nome público é só da coordenação", () => {
    expect(mayWrite(recordAccess(sensitive, false, true), "publicLanguageName")).toBe(false);
    expect(mayWrite(recordAccess(coordination, false, true), "publicLanguageName")).toBe(true);
  });

  it("o nome real de um projeto sensível não é de quem só vê o público", () => {
    expect(mayWrite(recordAccess(sensitive, false, true), "languageName")).toBe(false);
    expect(mayWrite(recordAccess(coordination, false, true), "languageName")).toBe(true);
    const open = project({ sensitiveCountry: false, readAs: "other" });
    expect(mayWrite(recordAccess(open, false, true), "languageName")).toBe(true);
  });
});

describe("o dublê de servidor reduz o nome como o servidor", () => {
  it("o nome público, ou a região quando falta, e nunca o nome real", async () => {
    const { withhold } = await import("../../fixtures/reader");
    const egypt = project({ languageName: "Sa'di of High Egypt", location: "Egypt", sensitiveCountry: true });

    const unnamed = withhold(egypt);
    expect(unnamed.languageName).not.toContain("Egypt");
    expect(unnamed.languageNameWithheld).toBe(true);

    const named = withhold({ ...egypt, publicLanguageName: "Sa'di" });
    expect(named.languageName).toBe("Sa'di");
    expect(named.publicLanguageName).toBeUndefined();
  });
});
