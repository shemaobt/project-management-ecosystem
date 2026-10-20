import { describe, expect, it } from "vitest";
import { mayOpenRecord, readMode } from "../../components/pages/ficha/recordMode";
import type { RegionKey } from "../../types/region";
import type { SessionRole } from "../../types/session";
import {
  canCreateProjects,
  canImportProjects,
  canMintLeaderLinks,
  canWithdrawMediaAuthorization,
  writesAnyProject,
  writesProjectIn,
} from "../access";
import { regionOf } from "../region";
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
    expect(canMintLeaderLinks(ADMIN_ALONE.writes)).toBe(false);
    expect(canImportProjects(ADMIN_ASIA.roles, ADMIN_ASIA.writes)).toBe(true);
    expect(canMintLeaderLinks(ADMIN_ASIA.writes)).toBe(true);
  });

  it("a coordenação e a plataforma importam e geram link; o Resource Circle não", () => {
    for (const who of [COORD_SA, PLATFORM]) {
      expect(canImportProjects(who.roles, who.writes), who.name).toBe(true);
      expect(canMintLeaderLinks(who.writes), who.name).toBe(true);
    }
    expect(canImportProjects(CIRCLE.roles, CIRCLE.writes)).toBe(false);
    expect(canMintLeaderLinks(CIRCLE.writes)).toBe(false);
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
    expect(canMintLeaderLinks(undefined)).toBe(true);
    expect(canWithdrawMediaAuthorization(["coordinator"], undefined, "africa")).toBe(true);
    expect(canWithdrawMediaAuthorization(["coordinator"])).toBe(true);
  });
});

describe("a região de um projeto tem uma leitura só (OBT-593)", () => {
  it("o regionOf lê a região derivada do servidor antes do país", () => {
    const derived = { ...INDIA(), derived: { region: "africa" } } as ReturnType<typeof INDIA>;
    expect(regionOf(derived)).toBe("africa");
    expect(regionOf(INDIA())).toBe("asia");
  });
});
