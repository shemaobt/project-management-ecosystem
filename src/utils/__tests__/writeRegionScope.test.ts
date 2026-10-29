import { describe, expect, it } from "vitest";
import { mayOpenRecord, readMode } from "../../components/pages/ficha/recordMode";
import type { RegionKey } from "../../types/region";
import type { SessionRole } from "../../types/session";
import {
  canCreateProjects,
  canImportProjects,
  canMintLeaderLinks,
  canWithdrawMediaAuthorization,
  canWriteHealthIn,
  newRecordNeedsPlace,
  newRecordOutsideWrites,
  leaderLinkProjects,
  writesAnyProject,
  writesProjectIn,
} from "../access";
import { regionOf, regionOfPlace } from "../region";
import { makeEmptyProject, missingRequired, type ProjectDraft } from "../../stores/recordStore";
import { assessmentRedirect } from "../../components/pages/avaliacao/writerGate";
import { mayWrite, recordAccess } from "../recordAccess";
import { makeProject } from "./factory";

/**
 * OBT-593 — the Admin reads every region as the coordination and writes only access (Daniel,
 * 19/oct, OBT-592). The session says where the account writes a project (`writeRegionScope`),
 * and *Editar*, the record's form and *Novo projeto* ask that, and only that.
 */
type Scope = readonly RegionKey[] | null | undefined;

interface Who {
  name: string;
  roles: SessionRole[];
  writes: Scope;
}

const ADMIN_ALONE: Who = { name: "Admin sozinho", roles: ["admin"], writes: [] };
const ADMIN_ASIA: Who = { name: "Admin + coordenação da Ásia", roles: ["coordinator", "admin"], writes: ["asia"] };
const COORD_SA: Who = { name: "coordenação da América do Sul", roles: ["coordinator"], writes: ["south-america"] };
const CIRCLE: Who = { name: "Resource Circle", roles: ["resourceCircle"], writes: [] };
const PLATFORM: Who = { name: "admin da plataforma", roles: ["coordinator"], writes: null };
const OBT_LAB: Who = { name: "OBT Lab da África", roles: ["obtLab"], writes: ["africa"] };

const project = (location: string, readAs: "coordination" | "trusted" | "other" = "coordination") =>
  makeProject({ location, readAs });
const INDIA = () => project("India");
const MOZAMBIQUE = () => project("Mozambique");
const PERU = () => project("Peru");

const access = (who: Who, location: () => ReturnType<typeof project>) =>
  recordAccess(location(), false, true, true, who.writes);

describe("onde o PME deixa escrever um projeto (OBT-593)", () => {
  it("ausente é o comportamento de hoje: não esconde nada e não libera nada novo", () => {
    expect(writesProjectIn(undefined, "asia")).toBe(true);
    expect(writesAnyProject(undefined)).toBe(true);
  });

  it("null escreve em todas as regiões; [] em nenhuma; uma lista só nelas", () => {
    expect(writesProjectIn(null, "africa")).toBe(true);
    expect(writesAnyProject(null)).toBe(true);
    expect(writesProjectIn([], "asia")).toBe(false);
    expect(writesAnyProject([])).toBe(false);
    expect(writesProjectIn(["asia"], "asia")).toBe(true);
    expect(writesProjectIn(["asia"], "africa")).toBe(false);
  });
});

describe("Editar e o formulário da ficha, por papel e região (OBT-593)", () => {
  it("o Admin sozinho lê como coordenação e não edita nada: sem Editar, ?modo=editar abre em ver", () => {
    for (const location of [INDIA, MOZAMBIQUE, PERU]) {
      const place = access(ADMIN_ALONE, location);
      expect(place.readOnly).toBe(true);
      expect(place.placeWritable).toBe(false);
      expect(mayWrite(place, "team")).toBe(false);
      expect(readMode("editar", false, place.readOnly)).toBe("ver");
    }
  });

  it("o Admin com coordenação da Ásia edita na Ásia e só lê na África", () => {
    expect(access(ADMIN_ASIA, INDIA).readOnly).toBe(false);
    expect(access(ADMIN_ASIA, INDIA).placeWritable).toBe(true);
    expect(access(ADMIN_ASIA, MOZAMBIQUE).readOnly).toBe(true);
    expect(access(ADMIN_ASIA, MOZAMBIQUE).placeWritable).toBe(false);
  });

  it("a coordenação regional não perde nada: edita a própria região como antes", () => {
    const now = access(COORD_SA, PERU);
    const before = recordAccess(PERU(), false, true, true, undefined);
    expect(now).toEqual(before);
    expect(now.readOnly).toBe(false);
  });

  it("o Resource Circle segue só leitura, com ou sem o campo", () => {
    const circle = () => project("India", "trusted");
    expect(recordAccess(circle(), false, true, false, CIRCLE.writes).readOnly).toBe(true);
    expect(recordAccess(circle(), false, true, false, undefined).readOnly).toBe(true);
  });

  it("o admin da plataforma escreve em toda região", () => {
    for (const location of [INDIA, MOZAMBIQUE, PERU]) {
      expect(access(PLATFORM, location).readOnly).toBe(false);
    }
  });

  it("sem o campo, a ficha do Admin fica como hoje — o servidor é que recusa", () => {
    expect(recordAccess(INDIA(), false, true, true, undefined).readOnly).toBe(false);
  });
});

describe("Novo projeto e /ficha/novo, por papel (OBT-593)", () => {
  it("o Admin sozinho não cria; com coordenação regional, cria", () => {
    expect(canCreateProjects(ADMIN_ALONE.roles, ADMIN_ALONE.writes)).toBe(false);
    expect(mayOpenRecord(true, ADMIN_ALONE.roles, ADMIN_ALONE.writes)).toBe(false);
    expect(canCreateProjects(ADMIN_ASIA.roles, ADMIN_ASIA.writes)).toBe(true);
  });

  it("a coordenação e a plataforma criam; o Resource Circle não", () => {
    expect(canCreateProjects(COORD_SA.roles, COORD_SA.writes)).toBe(true);
    expect(canCreateProjects(PLATFORM.roles, PLATFORM.writes)).toBe(true);
    expect(canCreateProjects(CIRCLE.roles, CIRCLE.writes)).toBe(false);
  });

  it("sem o campo, o Novo projeto segue a regra de hoje", () => {
    expect(canCreateProjects(["admin"], undefined)).toBe(true);
    expect(canCreateProjects(["coordinator"], undefined)).toBe(true);
    expect(canCreateProjects(["resourceCircle"], undefined)).toBe(false);
  });
});

describe("Importar, link do líder e retirada de autorização, por papel e região (OBT-593)", () => {
  it("o Admin sozinho não importa nem gera link; com coordenação regional, faz os dois", () => {
    expect(canImportProjects(ADMIN_ALONE.roles, ADMIN_ALONE.writes)).toBe(false);
    expect(canMintLeaderLinks(ADMIN_ALONE.roles, ADMIN_ALONE.writes)).toBe(false);
    expect(canImportProjects(ADMIN_ASIA.roles, ADMIN_ASIA.writes)).toBe(true);
    expect(canMintLeaderLinks(ADMIN_ASIA.roles, ADMIN_ASIA.writes)).toBe(true);
  });

  it("a coordenação e a plataforma importam e geram link; o Resource Circle não", () => {
    for (const who of [COORD_SA, PLATFORM]) {
      expect(canImportProjects(who.roles, who.writes), who.name).toBe(true);
      expect(canMintLeaderLinks(who.roles, who.writes), who.name).toBe(true);
    }
    expect(canImportProjects(CIRCLE.roles, CIRCLE.writes)).toBe(false);
    expect(canMintLeaderLinks(CIRCLE.roles, CIRCLE.writes)).toBe(false);
  });

  it("a retirada só aparece para a coordenação, e só onde ela escreve", () => {
    expect(canWithdrawMediaAuthorization(ADMIN_ALONE.roles, ADMIN_ALONE.writes, "asia")).toBe(false);
    expect(canWithdrawMediaAuthorization(ADMIN_ASIA.roles, ADMIN_ASIA.writes, "asia")).toBe(true);
    expect(canWithdrawMediaAuthorization(ADMIN_ASIA.roles, ADMIN_ASIA.writes, "africa")).toBe(false);
    expect(canWithdrawMediaAuthorization(COORD_SA.roles, COORD_SA.writes, "south-america")).toBe(true);
    expect(canWithdrawMediaAuthorization(PLATFORM.roles, PLATFORM.writes, "africa")).toBe(true);
    expect(canWithdrawMediaAuthorization(CIRCLE.roles, CIRCLE.writes, "asia")).toBe(false);
  });

  it("sem o campo, as três seguem a regra de hoje", () => {
    expect(canImportProjects(["admin"], undefined)).toBe(true);
    expect(canImportProjects(["resourceCircle"], undefined)).toBe(false);
    expect(canMintLeaderLinks(["coordinator"], undefined)).toBe(true);
    expect(canWithdrawMediaAuthorization(["coordinator"], undefined, "africa")).toBe(true);
    expect(canWithdrawMediaAuthorization(["coordinator"], undefined, "asia")).toBe(true);
  });
});

describe("a região de um projeto tem uma leitura só (OBT-593)", () => {
  it("o regionOf lê a região derivada do servidor antes do país", () => {
    const derived = { ...INDIA(), derived: { region: "africa" } } as ReturnType<typeof INDIA>;
    expect(regionOf(derived)).toBe("africa");
    expect(regionOf(INDIA())).toBe("asia");
  });
});

describe("o diálogo do link do líder oferece só onde a conta escreve (OBT-593)", () => {
  const all = () => [INDIA(), MOZAMBIQUE(), PERU()];
  const offered = (who: Who) => leaderLinkProjects(all(), who.writes).map((p) => p.location);

  it("Admin + coordenação da Ásia vê só a Ásia; coordenação da América do Sul só a América do Sul", () => {
    expect(offered(ADMIN_ASIA)).toEqual(["India"]);
    expect(offered(COORD_SA)).toEqual(["Peru"]);
  });

  it("o Admin sozinho não vê nenhum; a plataforma e o campo ausente veem todos", () => {
    expect(offered(ADMIN_ALONE)).toEqual([]);
    expect(offered(PLATFORM)).toEqual(["India", "Mozambique", "Peru"]);
    expect(leaderLinkProjects(all(), undefined)).toHaveLength(3);
  });
});

describe("Avaliação de Saúde por papel e região (OBT-593)", () => {
  const files = (who: Who, region: RegionKey) => canWriteHealthIn(who.roles, who.writes, region);

  it("o Admin sozinho não preenche; admin + coordenação da Ásia, só na Ásia", () => {
    expect(files(ADMIN_ALONE, "asia")).toBe(false);
    expect(files(ADMIN_ASIA, "asia")).toBe(true);
    expect(files(ADMIN_ASIA, "africa")).toBe(false);
  });

  it("coordenação e OBT Lab na própria região, plataforma em todas, o Círculo em nenhuma", () => {
    expect(files(COORD_SA, "south-america")).toBe(true);
    expect(files(COORD_SA, "asia")).toBe(false);
    expect(files(OBT_LAB, "africa")).toBe(true);
    expect(files(OBT_LAB, "asia")).toBe(false);
    expect(files(PLATFORM, "africa")).toBe(true);
    expect(files(CIRCLE, "asia")).toBe(false);
  });

  it("sem o campo, como hoje: o papel decide", () => {
    expect(canWriteHealthIn(["coordinator"], undefined, "africa")).toBe(true);
    expect(canWriteHealthIn(["resourceCircle"], undefined, "africa")).toBe(false);
  });

  it("a rota volta aos formulários fora da região, depois de ler o registro", () => {
    expect(assessmentRedirect(ADMIN_ASIA.roles, ADMIN_ASIA.writes)).toBeNull();
    expect(assessmentRedirect(ADMIN_ASIA.roles, ADMIN_ASIA.writes, "asia")).toBeNull();
    expect(assessmentRedirect(ADMIN_ASIA.roles, ADMIN_ASIA.writes, "africa")).toBe("/formularios");
    expect(assessmentRedirect(ADMIN_ALONE.roles, ADMIN_ALONE.writes)).toBe("/formularios");
    expect(assessmentRedirect(["coordinator"], undefined, "africa")).toBeNull();
  });
});

describe("o Ritmo escreve só a região da linha (OBT-593; a Equipe tem a regra do CoordinatorUser, OBT-620)", () => {
  const writes = (who: Who, region: RegionKey) => writesProjectIn(who.writes, region);

  it("a mesma regra da ficha, por região da linha", () => {
    expect(writes(ADMIN_ALONE, "asia")).toBe(false);
    expect(writes(ADMIN_ASIA, "asia")).toBe(true);
    expect(writes(ADMIN_ASIA, "africa")).toBe(false);
    expect(writes(COORD_SA, "south-america")).toBe(true);
    expect(writes(OBT_LAB, "africa")).toBe(true);
    expect(writes(PLATFORM, "oceania")).toBe(true);
    expect(writesProjectIn(undefined, "oceania")).toBe(true);
  });
});

describe("a ficha nova só aceita um local onde a conta escreve (OBT-593)", () => {
  it("admin + coordenação da Ásia: Índia passa, Moçambique não", () => {
    expect(newRecordOutsideWrites(ADMIN_ASIA.writes, "India, Delhi")).toBeNull();
    expect(newRecordOutsideWrites(ADMIN_ASIA.writes, "Mozambique, Maputo")).toBe("africa");
  });

  it("coordenação e OBT Lab na própria região; plataforma e campo ausente em qualquer lugar", () => {
    expect(newRecordOutsideWrites(COORD_SA.writes, "Peru")).toBeNull();
    expect(newRecordOutsideWrites(COORD_SA.writes, "India")).toBe("asia");
    expect(newRecordOutsideWrites(OBT_LAB.writes, "Mozambique")).toBeNull();
    expect(newRecordOutsideWrites(PLATFORM.writes, "Mozambique")).toBeNull();
    expect(newRecordOutsideWrites(undefined, "Mozambique")).toBeNull();
  });
});

/**
 * OBT-654 — um local em branco cai em `other`, e o POST recusa a quem não escreve lá: para essa
 * conta o que falta é o local, não uma região onde ele "fica" (PME-FIC-011).
 */
describe("a ficha nova sem local: falta o local, não uma região (OBT-654)", () => {
  const COORD_AF: Who = { name: "coordenação da África", roles: ["coordinator"], writes: ["africa"] };
  const COORD_OTHER: Who = { name: "coordenação de other", roles: ["coordinator"], writes: ["other"] };
  const COORD_2REG: Who = {
    name: "coordenação de duas regiões",
    roles: ["coordinator"],
    writes: ["south-america", "asia"],
  };
  const OLD_SERVER: Who = { name: "servidor sem o campo", roles: ["coordinator"], writes: undefined };
  const filled: ProjectDraft = {
    ...makeEmptyProject(),
    languageName: "Língua QA",
    bridgeLanguage: "Português",
    team: "YWAM QA",
    objective: ["NT"],
  };
  const missingFor = (writes: Scope, location: string) =>
    missingRequired({ ...filled, location }, recordAccess(undefined, true, true, true, writes));

  it("quem não escreve em `other` precisa nomear o local da ficha nova", () => {
    for (const who of [COORD_AF, COORD_SA, ADMIN_ASIA, COORD_2REG, OBT_LAB]) {
      expect(newRecordNeedsPlace(who.writes), who.name).toBe(true);
      expect(missingFor(who.writes, ""), who.name).toEqual(["location"]);
    }
  });

  it("local em branco não fica em região nenhuma — espaços e vírgulas também são branco", () => {
    for (const blank of ["", "   ", " , ", ",,"]) {
      expect(newRecordOutsideWrites(COORD_AF.writes, blank), blank).toBeNull();
      expect(missingFor(COORD_AF.writes, blank), blank).toEqual(["location"]);
    }
  });

  it("com um local que nomeia algo nada falta; fora das regiões é a frase da OBT-593 que diz", () => {
    expect(missingFor(COORD_AF.writes, "Mozambique, Tete")).toEqual([]);
    expect(newRecordOutsideWrites(COORD_AF.writes, "Mozambique, Tete")).toBeNull();
    expect(missingFor(COORD_AF.writes, "India")).toEqual([]);
    expect(newRecordOutsideWrites(COORD_AF.writes, "India")).toBe("asia");
  });

  it("quem escreve em `other`, em todas as regiões ou num servidor sem o campo salva sem local", () => {
    const writers: Scope[] = [["other"], ["africa", "other"], PLATFORM.writes, OLD_SERVER.writes];
    for (const writes of writers) {
      expect(newRecordNeedsPlace(writes)).toBe(false);
      expect(missingFor(writes, "")).toEqual([]);
      expect(newRecordOutsideWrites(writes, "")).toBeNull();
    }
  });

  it("a ficha salva não passa a pedir local", () => {
    const place = recordAccess(MOZAMBIQUE(), false, true, true, COORD_AF.writes);
    expect(place.placeRequired).toBe(false);
    expect(missingRequired({ ...filled, location: "" }, place)).toEqual([]);
  });

  it("a tela trava exatamente quando o POST recusaria pela região, e diz uma coisa só", () => {
    const accounts = [COORD_AF, COORD_OTHER, COORD_2REG, ADMIN_ASIA, OBT_LAB, PLATFORM, OLD_SERVER];
    const places = ["", "  ", " , ", "Mozambique, Tete", "India", "Peru", "Tete"];
    for (const who of accounts) {
      for (const location of places) {
        const missing = missingFor(who.writes, location).includes("location");
        const outside = newRecordOutsideWrites(who.writes, location) !== null;
        const refused = !writesProjectIn(who.writes, regionOfPlace(location));
        expect(missing && outside, `${who.name} · "${location}"`).toBe(false);
        expect(missing || outside, `${who.name} · "${location}"`).toBe(refused);
      }
    }
  });
});

describe("a retirada sem região conhecida não aparece (OBT-593)", () => {
  it("o padrão é não", () => {
    expect(canWithdrawMediaAuthorization(["coordinator"])).toBe(false);
    expect(canWithdrawMediaAuthorization(PLATFORM.roles, PLATFORM.writes)).toBe(false);
  });
});
