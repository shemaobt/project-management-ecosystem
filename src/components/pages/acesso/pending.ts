import type {
  AwaitingProject,
  ConfirmedMemberPayload,
  ConfirmedProject,
} from "../../../types/access";
import type { RegionKey } from "../../../types/region";
import { regionOfPlace } from "../../../utils/region";

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

/**
 * The region confirming will write (OBT-591): the server's answer while the place is the one
 * it filed, and the console's copy of the same map once the Admin edits it — the server
 * derives again from the place it receives, by the spellings `countryRegion.test.ts` holds
 * equal on both sides.
 */
export function regionToWrite(project: AwaitingProject, location: string): RegionKey {
  const kept = location.trim() === project.location.trim();
  return (kept ? project.region : undefined) ?? regionOfPlace(location);
}

export function keepConfirmation(
  current: readonly ConfirmedProject[],
  result: ConfirmedProject,
): readonly ConfirmedProject[] {
  return [...current.filter((entry) => entry.id !== result.id), result];
}
