import type { ConfirmedMemberPayload, ConfirmedProject } from "../../../types/access";

export interface MemberRow {
  key: string;
  name: string;
  role: string;
  email: string;
}

export function membersToSend(rows: readonly MemberRow[]): ConfirmedMemberPayload[] {
  return rows
    .map((row) => ({ name: row.name.trim(), email: row.email.trim() }))
    .filter((member) => member.name !== "" || member.email !== "");
}

export function keepConfirmation(
  current: readonly ConfirmedProject[],
  result: ConfirmedProject,
): readonly ConfirmedProject[] {
  return [...current.filter((entry) => entry.id !== result.id), result];
}
