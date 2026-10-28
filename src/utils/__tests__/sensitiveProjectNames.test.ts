import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { REGIONS } from "../../constants/regions";
import { emitSensitiveProjectNames } from "./emitSensitiveProjectNames";
import emitted from "./sensitiveProjectNames.json";

/**
 * OBT-657. Sem nome público, um projeto sensível chega com a chave da região no lugar do nome, e a
 * tela imprime *Projeto sensível — África*. O `shema-api` ordena o ETEN e a lista de Projetos por
 * esse nome impresso, na língua que o console diz no cabeçalho `X-Shema-Language` — e o sabe por
 * este arquivo, que vendoriza byte a byte em `app/utils/shema_sensitive_project_names.json`. Cada
 * lado falha quando sai do arquivo: aqui, quando os catálogos ou a `getLanguageNameDisplay` mudam o
 * que a tela imprime; lá, quando a cópia não cobre uma região ou uma língua.
 */
const ARTIFACT = new URL("./sensitiveProjectNames.json", import.meta.url);

describe("o nome impresso no lugar da chave é o vetor que o servidor ordena", () => {
  it("o arquivo é o que a tela imprime hoje, byte a byte — re-emita com npm run emit:sensitive-names", () => {
    expect(readFileSync(ARTIFACT, "utf8")).toBe(emitSensitiveProjectNames());
  });

  it("cobre as sete regiões nas duas línguas do console, e nenhuma chave sai crua", () => {
    const regions = REGIONS.map((region) => region.key);
    expect(Object.keys(emitted).sort()).toEqual(["en", "pt-BR"]);
    for (const names of Object.values(emitted)) {
      expect(Object.keys(names)).toEqual(regions);
      for (const [key, name] of Object.entries(names)) {
        expect(name).not.toBe(key);
      }
    }
    expect(emitted["pt-BR"].africa).toBe("Projeto sensível — África");
    expect(emitted.en.africa).toBe("Sensitive project — Africa");
  });
});
