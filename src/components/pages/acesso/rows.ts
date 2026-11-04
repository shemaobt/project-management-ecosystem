import type { AccessAppKey } from "../../../types/access";
import type { SessionRole } from "../../../types/session";

export function roleRow(app: AccessAppKey, role: SessionRole): string {
  return `${app}:${role}`;
}

export function memberRow(projectId: string): string {
  return `member:${projectId}`;
}

export function rosterRow(projectId: string): string {
  return `roster:${projectId}`;
}
