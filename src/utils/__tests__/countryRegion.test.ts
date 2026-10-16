import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { COUNTRY_REGION, COUNTRY_SYNONYMS } from "../../constants/regions";
import { getCountry, getRegion } from "../region";
import emitted from "./countryRegion.json";

/**
 * As grafias que viram região (OBT-591), dos dois lados. `countryRegion.json` é a emissão de
 * `src/constants/regions.ts` (`npm run emit:regions`) e o `shema-api` a vendoriza byte a byte
 * em `tests/test_shema/countryRegion.json`, onde `test_parity.py` a confere contra
 * `COUNTRY_REGION` e `COUNTRY_SYNONYMS` do servidor — o mecanismo do `dataJsParity.json`
 * (shema-api `docs/shema.md` §6.5). Aqui ela é conferida contra as tabelas do console: uma
 * grafia acrescentada de um lado só falha desse lado.
 */
const ARTIFACT = new URL("./countryRegion.json", import.meta.url);

const regionOf = (location: string) => getRegion({ location });

describe("a cópia do mapa é a emissão que o servidor vendoriza", () => {
  it("as duas tabelas são o arquivo, entrada por entrada", () => {
    expect(COUNTRY_REGION).toEqual(emitted.countries);
    expect(COUNTRY_SYNONYMS).toEqual(emitted.synonyms);
  });

  it("o arquivo é a emissão de hoje, byte a byte — re-emita com npm run emit:regions", () => {
    const emission = `${JSON.stringify(
      { countries: COUNTRY_REGION, synonyms: COUNTRY_SYNONYMS },
      null,
      2,
    )}\n`;
    expect(readFileSync(ARTIFACT, "utf8")).toBe(emission);
  });

  it("toda grafia do arquivo resolve para a região que ele diz", () => {
    const countries: Record<string, string> = emitted.countries;
    for (const [country, region] of Object.entries(countries)) {
      expect(regionOf(country)).toBe(region);
    }
    for (const [spelling, country] of Object.entries(emitted.synonyms)) {
      expect(regionOf(spelling)).toBe(countries[country]);
    }
  });
});

describe("um sinônimo é listado, nunca uma leitura da string", () => {
  it("aponta para uma grafia do export, então não acrescenta país nem muda um de região", () => {
    const exportSpellings = new Set(Object.keys(COUNTRY_REGION));
    for (const [spelling, country] of Object.entries(COUNTRY_SYNONYMS)) {
      expect(exportSpellings.has(country)).toBe(true);
      expect(exportSpellings.has(spelling)).toBe(false);
    }
    expect(exportSpellings.size).toBe(25);
  });

  it("África do Sul, Sudáfrica e South Africa caem na África", () => {
    expect(["África do Sul", "Sudáfrica", "South Africa"].map(regionOf)).toEqual([
      "africa",
      "africa",
      "africa",
    ]);
  });

  it("acento, caixa e espaço fazem parte da grafia: quase igual é other", () => {
    for (const spelling of ["Africa do Sul", "áfrica do sul", "ÁFRICA DO SUL", "África  do Sul"]) {
      expect(regionOf(spelling)).toBe("other");
    }
  });

  it("o sinônimo move a região, nunca o país que a tela mostra", () => {
    expect(getCountry({ location: "África do Sul" })).toBe("África do Sul");
  });

  it("só a primeira parte nomeia o país: cidade primeiro é other", () => {
    expect(regionOf("Cidade do Cabo, África do Sul")).toBe("other");
    expect(regionOf("África do Sul, Cidade do Cabo")).toBe("africa");
  });

  it("uma chave herdada do objeto não é país", () => {
    expect(regionOf("constructor")).toBe("other");
    expect(regionOf("toString")).toBe("other");
  });
});
