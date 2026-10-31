import { describe, expect, it } from "vitest";
import { REGIONS } from "../../constants/regions";
import type { RegionKey } from "../../types/region";
import type { SessionRole } from "../../types/session";
import {
  canApplySubmission,
  canMintLeaderLinks,
  canWithdrawMediaAuthorization,
  canWriteRegionTeam,
} from "../access";

type Scope = readonly RegionKey[] | null | undefined;

interface Who {
  name: string;
  roles: SessionRole[];
  writes: Scope;
  home: RegionKey;
}

const COORD: Who = { name: "coordenação com escrita", roles: ["coordinator"], writes: ["south-america"], home: "south-america" };
const COORD_NO_REGION: Who = { name: "coordenação sem escrita", roles: ["coordinator"], writes: [], home: "south-america" };
const OBT_LAB: Who = { name: "OBT Lab", roles: ["obtLab"], writes: ["africa"], home: "africa" };
const CIRCLE: Who = { name: "Resource Circle", roles: ["resourceCircle"], writes: [], home: "oceania" };
const ADMIN_ALONE: Who = { name: "Admin sozinho", roles: ["admin"], writes: [], home: "asia" };
const PLATFORM: Who = { name: "plataforma (is_platform_admin, com o papel admin)", roles: ["admin"], writes: null, home: "asia" };

const MATRIX: readonly [Who, boolean][] = [
  [COORD, true],
  [COORD_NO_REGION, false],
  [OBT_LAB, false],
  [CIRCLE, false],
  [ADMIN_ALONE, false],
  [PLATFORM, true],
];

const ALL_REGIONS = REGIONS.map((region) => region.key);

describe("Link do líder e Equipe, pela regra do CoordinatorUser (OBT-620)", () => {
  it.each(MATRIX)("o Link do líder aparece só para quem o POST /intake-links admite — %s", (who, expected) => {
    expect(canMintLeaderLinks(who.roles, who.writes), who.name).toBe(expected);
  });

  it.each(MATRIX)("a Equipe só é editável para quem o PUT do time admite — %s", (who, expected) => {
    expect(canWriteRegionTeam(who.roles, who.writes, who.home), who.name).toBe(expected);
  });

  it("OBT Lab, Resource Circle e Admin sozinho não geram link nem editam assento, com o campo presente ou ausente", () => {
    for (const who of [OBT_LAB, CIRCLE, ADMIN_ALONE]) {
      for (const writes of [who.writes, undefined]) {
        expect(canMintLeaderLinks(who.roles, writes), `${who.name} · ${String(writes)}`).toBe(false);
        for (const region of ALL_REGIONS) {
          expect(canWriteRegionTeam(who.roles, writes, region), `${who.name} · ${region}`).toBe(false);
        }
      }
    }
  });

  it("a coordenação edita só a região em que escreve; a plataforma, todas", () => {
    for (const region of ALL_REGIONS) {
      expect(canWriteRegionTeam(COORD.roles, COORD.writes, region), region).toBe(region === "south-america");
      expect(canWriteRegionTeam(PLATFORM.roles, PLATFORM.writes, region), region).toBe(true);
    }
  });

  it("sem o campo, a coordenação segue como hoje: gera link e edita onde alcança", () => {
    expect(canMintLeaderLinks(["coordinator"], undefined)).toBe(true);
    expect(canWriteRegionTeam(["coordinator"], undefined, "africa")).toBe(true);
  });

  it("a plataforma é reconhecida pelo writeRegionScope null, não pelo papel; ausente não reconhece ninguém", () => {
    expect(canMintLeaderLinks(["obtLab"], null)).toBe(true);
    expect(canMintLeaderLinks(["obtLab"], undefined)).toBe(false);
    expect(canMintLeaderLinks(["resourceCircle"], null)).toBe(true);
    expect(canMintLeaderLinks(["admin"], null)).toBe(true);
    expect(canMintLeaderLinks(["admin"], [])).toBe(false);
    expect(canWriteRegionTeam(["obtLab"], null, "europe")).toBe(true);
    expect(canWriteRegionTeam(["obtLab"], undefined, "europe")).toBe(false);
  });

  it("quem soma o papel coordinator a outro gera link onde escreve", () => {
    expect(canMintLeaderLinks(["coordinator", "resourceCircle"], ["south-america"])).toBe(true);
    expect(canMintLeaderLinks(["coordinator", "admin"], ["asia"])).toBe(true);
    expect(canMintLeaderLinks(["obtLab", "resourceCircle"], ["africa"])).toBe(false);
  });
});

describe("a retirada da autorização da foto segue a mesma régua (OBT-620)", () => {
  it("coordenação onde escreve e plataforma em qualquer região; OBT Lab e Admin sozinho nunca", () => {
    expect(canWithdrawMediaAuthorization(COORD.roles, COORD.writes, "south-america")).toBe(true);
    expect(canWithdrawMediaAuthorization(COORD.roles, COORD.writes, "africa")).toBe(false);
    expect(canWithdrawMediaAuthorization(PLATFORM.roles, PLATFORM.writes, "africa")).toBe(true);
    expect(canWithdrawMediaAuthorization(OBT_LAB.roles, OBT_LAB.writes, "africa")).toBe(false);
    expect(canWithdrawMediaAuthorization(ADMIN_ALONE.roles, ADMIN_ALONE.writes, "asia")).toBe(false);
  });

  it("sem a região do projeto, não aparece nem para a plataforma", () => {
    expect(canWithdrawMediaAuthorization(PLATFORM.roles, PLATFORM.writes)).toBe(false);
  });
});

describe("aplicar um Pulso da caixa na ficha segue a régua do POST …/import (OBT-652)", () => {
  it.each(MATRIX)("o botão de aplicar aparece só para quem a rota admite, na região do projeto — %s", (who, expected) => {
    expect(canApplySubmission(who.roles, who.writes, who.home), who.name).toBe(expected);
  });

  it("a coordenação aplica só onde escreve; a plataforma, em qualquer região", () => {
    for (const region of ALL_REGIONS) {
      expect(canApplySubmission(COORD.roles, COORD.writes, region), region).toBe(region === "south-america");
      expect(canApplySubmission(PLATFORM.roles, PLATFORM.writes, region), region).toBe(true);
    }
  });

  it("sem a região do projeto, ninguém vê o botão", () => {
    expect(canApplySubmission(COORD.roles, COORD.writes)).toBe(false);
    expect(canApplySubmission(PLATFORM.roles, PLATFORM.writes)).toBe(false);
  });
});
