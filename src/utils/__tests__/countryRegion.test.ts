import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { COUNTRY_REGION, COUNTRY_SYNONYMS } from "../../constants/regions";
import { getCountry, getRegion, regionOfPlace } from "../region";
import emitted from "./countryRegion.json";

/**
 * As grafias que viram região (OBT-591). `countryRegion.json` é a emissão de
 * `src/constants/regions.ts` (`npm run emit:regions`); o `shema-api` a vendoriza byte a byte em
 * `tests/test_shema/countryRegion.json`, e o `test_parity.py` de lá a confere contra as tabelas
 * do servidor — o mecanismo do `dataJsParity.json` (shema-api `docs/shema.md` §6.5). Cada lado
 * falha quando as suas tabelas saem do arquivo; o arquivo atravessa por cópia, então mudar uma
 * grafia é um diff dele nos dois repositórios.
 */
const ARTIFACT = new URL("./countryRegion.json", import.meta.url);

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

  it("toda grafia do arquivo resolve para a região que ele diz, ao gravar e ao ler", () => {
    const countries: Record<string, string> = emitted.countries;
    const expected = new Map<string, string>(Object.entries(countries));
    for (const [spelling, country] of Object.entries(emitted.synonyms)) {
      expected.set(spelling, countries[country]);
    }
    for (const [spelling, region] of expected) {
      expect(regionOfPlace(spelling)).toBe(region);
      expect(getRegion({ location: spelling })).toBe(region);
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
    expect(["África do Sul", "Sudáfrica", "South Africa"].map(regionOfPlace)).toEqual([
      "africa",
      "africa",
      "africa",
    ]);
  });

  it("acento, caixa e espaço fazem parte da grafia: quase igual é other", () => {
    for (const spelling of ["Africa do Sul", "áfrica do sul", "ÁFRICA DO SUL", "África  do Sul"]) {
      expect(regionOfPlace(spelling)).toBe("other");
    }
  });

  it("o sinônimo move a região, nunca o país que a tela mostra", () => {
    expect(getCountry({ location: "África do Sul" })).toBe("África do Sul");
  });

  it("só a primeira parte nomeia o país: cidade primeiro é other", () => {
    expect(regionOfPlace("Cidade do Cabo, África do Sul")).toBe("other");
    expect(regionOfPlace("África do Sul, Cidade do Cabo")).toBe("africa");
  });

  it("a primeira parte é a primeira que não está em branco, como no servidor", () => {
    expect(getCountry({ location: ", África do Sul" })).toBe("África do Sul");
    expect(regionOfPlace(" , Perú, Lima")).toBe("south-america");
    expect(getCountry({ location: " , " })).toBe("");
  });

  it("uma chave herdada do objeto não é país", () => {
    expect(regionOfPlace("constructor")).toBe("other");
    expect(getRegion({ location: "toString" })).toBe("other");
  });

  it("uma chave de região digitada como local é other ao gravar; só o payload reduzido a lê", () => {
    expect(regionOfPlace("africa")).toBe("other");
    expect(getRegion({ location: "africa" })).toBe("africa");
  });
});
