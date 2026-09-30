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
  projectId?: string | null;
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

export interface ProposedMember {
  name: string;
  role: string;
  email: string;
}

export interface AwaitingProject {
  id: string;
  languageName: string;
  languageCode: string;
  location: string;
  team: string;
  requestId: string;
  requestName: string;
  filedAt: string;
  members: ProposedMember[];
  locationWithheld: boolean;
}

export interface ConfirmedMemberPayload {
  name: string;
  email: string;
}

export interface ProjectConfirmation {
  languageName: string;
  languageCode: string;
  location: string;
  team: string;
  sensitiveCountry: boolean;
  members: ConfirmedMemberPayload[];
}

export interface JoinedMember {
  email: string;
  userId: string;
}

export interface InvitedMember {
  email: string;
  inviteId: string;
  inviteUrl: string;
  emailSent: boolean;
}

export interface ConfirmedProject {
  id: string;
  languageName: string;
  requestIds: string[];
  joined: JoinedMember[];
  invited: InvitedMember[];
  withoutEmail: string[];
}

export interface DiscardedProject {
  id: string;
  reason: string;
  discardedAt: string;
  requestId: string;
  requestProjectId: string | null;
  detail: string;
}
