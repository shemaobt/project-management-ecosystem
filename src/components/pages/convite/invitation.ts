import type {
  AccessAppKey,
  InviteDescription,
  JoinStage,
} from "../../../types/access";
import type { ApiFailure, SessionRole } from "../../../types/session";
import { SHEMA_APP } from "../../../constants/access";
import { appOfInvitedRole, invitableRoles } from "../../../utils/access";

const TEAM_ROLE: SessionRole = "equipe";

export type ClosedReason =
  | "missing"
  | "notFound"
  | "expired"
  | "used"
  | "revoked"
  | "unknownRole";

export type InvitationReading =
  | { open: true; role: SessionRole; app: AccessAppKey }
  | { open: false; reason: ClosedReason };

export function readInvitation(invite: InviteDescription): InvitationReading {
  if (invite.status !== "pending") return { open: false, reason: invite.status };
  if (invite.roleKey === TEAM_ROLE) return { open: true, role: TEAM_ROLE, app: SHEMA_APP };
  const app = appOfInvitedRole(invite.roleKey);
  const role = app
    ? invitableRoles(app).find((invitable) => invitable === invite.roleKey)
    : undefined;
  return app && role ? { open: true, role, app } : { open: false, reason: "unknownRole" };
}

export const MIN_PASSWORD = 8;

export interface JoinFailure {
  stage: JoinStage;
  failure: ApiFailure;
  accountCreated: boolean;
}

export function createsAccount(
  invite: InviteDescription,
  failure: JoinFailure | null,
): boolean {
  if (invite.accountExists || failure?.accountCreated) return false;
  return !(failure?.stage === "auth" && failure.failure.kind === "conflict");
}
