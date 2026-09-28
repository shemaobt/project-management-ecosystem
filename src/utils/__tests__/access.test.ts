import { describe, expect, it } from "vitest";
import { ACCESS_APPS, GRANTABLE_ROLES } from "../../constants/access";
import { SESSION_ROLES } from "../../constants/roles";
import type { AccountGrants } from "../../types/access";
import {
  appOfInvitedRole,
  canAdministerAccess,
  canSubmitRegions,
  invitableRoles,
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
