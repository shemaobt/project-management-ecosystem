import type { RoleDefinition, RoleKey } from "../types/role";

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
