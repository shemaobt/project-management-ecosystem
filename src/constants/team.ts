import type { RoleKey } from "../types/role";
import type { TeamBody, TeamBodyKey } from "../types/team";

export const GLOBAL_ROLE_LABEL_KEY = "equipe_global";

export const TEAM_BODIES: readonly TeamBody[] = [
  {
    key: "leadership",
    labelKey: "ritmo_role_leadership",
    scopeKey: "equipe_body_leadership_scope",
    purposeKey: "equipe_body_leadership_purpose",
  },
  {
    key: "resourceCircle",
    labelKey: "ritmo_role_resourcecircle",
    scopeKey: "equipe_body_resource_scope",
    purposeKey: "equipe_body_resource_purpose",
  },
  {
    key: "projectsTeam",
    labelKey: "equipe_body_projects",
    scopeKey: "equipe_body_projects_scope",
    purposeKey: "equipe_body_projects_purpose",
  },
];

export const ROLE_BODY: Record<RoleKey, TeamBodyKey> = {
  coordinator: "region",
  obtLab: "projectsTeam",
  resourceCircle: "resourceCircle",
};

export const BODY_LABEL_KEYS: Record<TeamBodyKey, string> = {
  leadership: "ritmo_role_leadership",
  resourceCircle: "ritmo_role_resourcecircle",
  projectsTeam: "equipe_body_projects",
  region: "equipe_body_region",
};
