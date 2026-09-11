import type { RoleDefinition, RoleKey } from "../types/role";
import type { SessionRole } from "../types/session";

export const ROLE_DEFINITIONS: Record<RoleKey, RoleDefinition> = {
  coordinator: {
    key: "coordinator",
    labelKey: "role_coordinator",
    descriptionKey: "role_coordinator_sub",
  },
  obtLab: {
    key: "obtLab",
    labelKey: "role_obtlab",
    descriptionKey: "role_obtlab_sub",
  },
  resourceCircle: {
    key: "resourceCircle",
    labelKey: "role_resource",
    descriptionKey: "role_resource_sub",
  },
};

export const ROLES: readonly RoleDefinition[] = Object.values(ROLE_DEFINITIONS);

export const GLOBAL_STRATEGIST_ROLE = "globalStrategist" as const;

export const SESSION_ROLES: readonly SessionRole[] = [
  GLOBAL_STRATEGIST_ROLE,
  ...ROLES.map((role) => role.key),
];
