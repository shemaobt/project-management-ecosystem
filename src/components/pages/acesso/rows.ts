import type { AccessAppKey } from "../../../types/access";
import type { SessionRole } from "../../../types/session";

export function roleRow(app: AccessAppKey, role: SessionRole): string {
  return `${app}:${role}`;
}

/** A project on the card's *Membro de* list, taken off from there. */
export function memberRow(projectId: string): string {
  return `member:${projectId}`;
}

/** The project picked below the list, whose roster adds or takes the person off. */
export function rosterRow(projectId: string): string {
  return `roster:${projectId}`;
}
