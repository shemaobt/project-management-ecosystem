import type { IntakeLinkStatus } from "./forms";
import type { RegionKey } from "./region";
import type { ApiFailure, SessionRole } from "./session";

export type AccessAppKey = "shema" | "resource-request-form";

export interface AccessAppRoles {
  appKey: AccessAppKey;
  roles: SessionRole[];
}

export interface AccessRegionGrant {
  regionKey: RegionKey;
  grantedBy: string | null;
  grantedAt: string;
}

export interface AccountGrants {
  userId: string;
  email: string;
  displayName: string | null;
  isActive: boolean;
  apps: AccessAppRoles[];
  regions: AccessRegionGrant[];
  regionScope: RegionKey[] | null;
}

export interface RoleGrantPayload {
  userId: string;
  appKey: AccessAppKey;
  roleKey: SessionRole;
  regionKeys: RegionKey[];
}

export interface RoleRevokePayload {
  userId: string;
  appKey: AccessAppKey;
  roleKey: SessionRole;
}

export interface InvitePayload {
  email: string;
  appKey: AccessAppKey;
  roleKey: SessionRole;
  regionKeys: RegionKey[];
}

export type InviteStatus = IntakeLinkStatus;

export interface OpenInvite {
  id: string;
  email: string;
  appKey: AccessAppKey;
  roleKey: string;
  regionKeys: RegionKey[];
  status: InviteStatus;
  createdAt: string;
  expiresAt: string;
  createdBy: string | null;
}

export interface SentInvite extends OpenInvite {
  inviteUrl: string;
  emailSent: boolean;
}

export type GrantAction = "granted" | "revoked";

export interface GrantChange {
  action: GrantAction;
  at: string;
  appKey: string;
  roleKey: string | null;
  regionKey: string | null;
  userId: string;
  userEmail: string | null;
  userName: string | null;
  actorId: string | null;
  actorEmail: string | null;
  actorName: string | null;
}

export interface InviteDescription {
  status: InviteStatus;
  email: string;
  roleKey: string;
  accountExists: boolean;
  regionKeys: string[];
}

export interface JoinEntry {
  email: string;
  password: string;
  displayName: string | null;
  create: boolean;
}

export type JoinStage = "auth" | "accept";

export type JoinOutcome =
  | { ok: true }
  | {
      ok: false;
      stage: JoinStage;
      failure: ApiFailure;
      accountCreated: boolean;
    };
