import {
  ACCESS_APPS,
  ADMIN_ROLE,
  GRANTABLE_ROLES,
  SHEMA_APP,
} from "../constants/access";
import { ROLE_DEFINITIONS } from "../constants/roles";
import type { AccessAppKey, AccountGrants } from "../types/access";
import type { RoleKey } from "../types/role";
import type { SessionRole } from "../types/session";

export function canAdministerAccess({
  roles,
}: {
  roles: readonly SessionRole[];
}): boolean {
  return roles.includes(ADMIN_ROLE);
}

export function isRegionalRole(role: string): role is RoleKey {
  return Object.hasOwn(ROLE_DEFINITIONS, role);
}

export function canSubmitRegions(
  role: SessionRole,
  regions: readonly string[],
): boolean {
  return !isRegionalRole(role) || regions.length > 0;
}

export function rolesHeld(
  account: AccountGrants,
  app: AccessAppKey,
): readonly SessionRole[] {
  return account.apps.find((entry) => entry.appKey === app)?.roles ?? [];
}

export function revokesLastRegional(
  account: AccountGrants,
  app: AccessAppKey,
  role: SessionRole,
): boolean {
  if (app !== SHEMA_APP || !isRegionalRole(role)) return false;
  return rolesHeld(account, SHEMA_APP).every(
    (held) => held === role || !isRegionalRole(held),
  );
}

export function invitableRoles(app: AccessAppKey): readonly SessionRole[] {
  return GRANTABLE_ROLES[app].filter((role) => role !== ADMIN_ROLE);
}

export function appOfInvitedRole(role: string): AccessAppKey | null {
  return (
    ACCESS_APPS.find((app) =>
      invitableRoles(app).some((invitable) => invitable === role),
    ) ?? null
  );
}
