import type { AccessAPI } from "../../../../services/api";
import type { AccountGrants } from "../../../../types/access";
import type { SessionRole } from "../../../../types/session";

const never = () => new Promise<never>(() => undefined);

export const STUB_API: AccessAPI = {
  person: never,
  grant: never,
  revoke: never,
  invite: never,
  revokeInvite: never,
  invites: never,
  changes: never,
  describeInvite: never,
  join: never,
};

export function sessionFor(roles: SessionRole[]) {
  return {
    status: "ready" as const,
    user: {
      id: "u-admin",
      role: roles[0] ?? ("globalStrategist" as const),
      roles,
      regionScope: [],
      name: null,
    },
    visibleRegions: [],
    canSeeRegion: () => false,
    signIn: async () => undefined,
    signOut: async () => undefined,
    switchRole: null,
    failure: null,
  };
}

export const ACCOUNT: AccountGrants = {
  userId: "u-9",
  email: "pessoa@exemplo.org",
  displayName: "Pessoa Exemplo",
  isActive: true,
  apps: [
    { appKey: "shema", roles: ["coordinator"] },
    { appKey: "resource-request-form", roles: ["gestor"] },
  ],
  regions: [
    { regionKey: "africa", grantedBy: "u-1", grantedAt: "2026-09-27T10:00:00Z" },
  ],
  regionScope: ["africa"],
};
