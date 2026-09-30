import { describe, expect, it } from "vitest";
import { ACCESS_APPS, GRANTABLE_ROLES } from "../../constants/access";
import { SESSION_ROLES } from "../../constants/roles";
import type { AccountGrants } from "../../types/access";
import {
  appOfInvitedRole,
  canAdministerAccess,
  canSubmitRegions,
  holdsFormRole,
  holdsShemaGrant,
  invitableRoles,
  isFormOnly,
  isRegionalRole,
  revokesLastRegional,
} from "../access";

const account = (shema: AccountGrants["apps"][number]["roles"]): AccountGrants => ({
  userId: "u-1",
  email: "pessoa@exemplo.org",
  displayName: null,
  isActive: true,
  apps: [
    { appKey: "shema", roles: shema },
    { appKey: "resource-request-form", roles: [] },
  ],
  regions: [],
  regionScope: [],
});

describe("quem administra o acesso", () => {
  it("é quem tem admin na lista — mesmo quando o papel principal é outro", () => {
    expect(canAdministerAccess({ roles: ["admin"] })).toBe(true);
    expect(canAdministerAccess({ roles: ["globalStrategist", "admin", "gestor"] })).toBe(true);
  });

  it("e nenhum dos outros sete papéis", () => {
    for (const role of SESSION_ROLES.filter((key) => key !== "admin")) {
      expect(canAdministerAccess({ roles: [role] }), role).toBe(false);
    }
    expect(canAdministerAccess({ roles: [] })).toBe(false);
  });
});

describe("a regra regional, refletida na tela", () => {
  it("os três papéis do organograma são os regionais, e só eles", () => {
    expect(SESSION_ROLES.filter(isRegionalRole)).toEqual(["coordinator", "obtLab", "resourceCircle"]);
  });

  it("papel regional não se concede sem região; os outros não pedem", () => {
    expect(canSubmitRegions("coordinator", [])).toBe(false);
    expect(canSubmitRegions("coordinator", ["africa"])).toBe(true);
    expect(canSubmitRegions("admin", [])).toBe(true);
    expect(canSubmitRegions("mesa", [])).toBe(true);
  });

  it("revogar o último regional avisa; revogar um de dois, não", () => {
    expect(revokesLastRegional(account(["obtLab"]), "shema", "obtLab")).toBe(true);
    expect(revokesLastRegional(account(["obtLab", "admin"]), "shema", "obtLab")).toBe(true);
    expect(revokesLastRegional(account(["coordinator", "obtLab"]), "shema", "obtLab")).toBe(false);
    expect(revokesLastRegional(account(["admin"]), "shema", "admin")).toBe(false);
  });
});

describe("o convite", () => {
  it("nunca oferece o Admin, que o servidor recusa por link", () => {
    for (const app of ACCESS_APPS) {
      expect(invitableRoles(app), app).not.toContain("admin");
      expect(invitableRoles(app).length, app).toBe(GRANTABLE_ROLES[app].length - 1);
    }
  });

  it("o app sai do papel convidado, e papel fora do vocabulário não tem app", () => {
    expect(appOfInvitedRole("obtLab")).toBe("shema");
    expect(appOfInvitedRole("globalStrategist")).toBe("shema");
    expect(appOfInvitedRole("mesa")).toBe("resource-request-form");
    expect(appOfInvitedRole("admin")).toBeNull();
    expect(appOfInvitedRole("lider")).toBeNull();
    expect(appOfInvitedRole("")).toBeNull();
  });
});

describe("o que cada papel vê do formulário — OBT-544", () => {
  it("só papel do formulário é mesa ou gestor, e nada mais", () => {
    expect(isFormOnly(["mesa"])).toBe(true);
    expect(isFormOnly(["gestor"])).toBe(true);
    expect(isFormOnly(["gestor", "mesa"])).toBe(true);
    expect(isFormOnly(["admin"])).toBe(false);
    expect(isFormOnly(["mesa", "equipe"])).toBe(false);
    expect(isFormOnly(["coordinator", "mesa"])).toBe(false);
    expect(isFormOnly([])).toBe(false);
  });

  it("a entrada Círculo de Recursos é de mesa, gestor e admin — os papéis que o formulário concede", () => {
    for (const role of GRANTABLE_ROLES["resource-request-form"]) {
      expect(holdsFormRole([role]), role).toBe(true);
    }
    for (const role of ["globalStrategist", "coordinator", "obtLab", "resourceCircle", "equipe"] as const) {
      expect(holdsFormRole([role]), role).toBe(false);
    }
    expect(holdsFormRole(["globalStrategist", "admin", "gestor"])).toBe(true);
  });

  it("o organograma só é pedido por quem tem grant do Shemá — a porta dos outros é só a sessão", () => {
    for (const role of GRANTABLE_ROLES.shema) {
      expect(holdsShemaGrant([role]), role).toBe(true);
    }
    for (const role of ["mesa", "gestor", "equipe"] as const) {
      expect(holdsShemaGrant([role]), role).toBe(false);
    }
    expect(holdsShemaGrant(["mesa", "gestor"])).toBe(false);
  });
});
