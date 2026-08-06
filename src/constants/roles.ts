import type { RoleDefinition } from "../types/role";

export const ROLES: readonly RoleDefinition[] = [
  {
    key: "coordinator",
    labelKey: "role_coordinator",
    descriptionKey: "role_coordinator_sub",
  },
  {
    key: "obtLab",
    labelKey: "role_obtlab",
    descriptionKey: "role_obtlab_sub",
  },
  {
    key: "resourceCircle",
    labelKey: "role_resource",
    descriptionKey: "role_resource_sub",
  },
];
