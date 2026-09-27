import type { AccessAppKey } from "../types/access";
import type { SessionRole } from "../types/session";
import { GLOBAL_STRATEGIST_ROLE, ROLES, SESSION_ROLES } from "./roles";

export const SHEMA_APP: AccessAppKey = "shema";

export const FORM_APP: AccessAppKey = "resource-request-form";

export const ACCESS_APPS: readonly AccessAppKey[] = [SHEMA_APP, FORM_APP];

export const APP_LABEL_KEYS: Record<AccessAppKey, string> = {
  shema: "acesso_app_shema",
  "resource-request-form": "acesso_app_form",
};

export const ADMIN_ROLE: SessionRole = "admin";

const FORM_SEATS: readonly SessionRole[] = ["gestor", "mesa"];

const SHEMA_GRANTS: readonly SessionRole[] = [
  GLOBAL_STRATEGIST_ROLE,
  ...ROLES.map((role) => role.key),
  ADMIN_ROLE,
];

const inPrecedence = (roles: readonly SessionRole[]): SessionRole[] =>
  SESSION_ROLES.filter((role) => roles.includes(role));

export const GRANTABLE_ROLES: Record<AccessAppKey, readonly SessionRole[]> = {
  shema: inPrecedence(SHEMA_GRANTS),
  "resource-request-form": inPrecedence([ADMIN_ROLE, ...FORM_SEATS]),
};
