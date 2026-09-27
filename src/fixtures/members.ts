import { failure } from "../services/api/errors";
import type { ProjectMember, ProjectRef } from "../types/project";

/**
 * The members double — BE-18 (OBT-524).
 *
 * Honest rather than populated: the fixtures carry no accounts, and FE-36 forbids inventing
 * people, so every roster is empty and nobody is a member of anything. The two writes are
 * refused with the answer the server gives the four mocked personas — only the Admin writes a
 * roster, and none of them is the Admin — so a screen driven against fixtures learns what the
 * real server would say rather than a success nothing stored.
 */
export async function listMembers(projectId: string): Promise<ProjectMember[]> {
  void projectId;
  return [];
}

export async function myProjects(): Promise<ProjectRef[]> {
  return [];
}

export async function refuseRosterWrite(
  projectId: string,
  userId: string,
): Promise<never> {
  throw failure(
    "forbidden",
    `Only the Admin changes who is on ${projectId}; ${userId} was not changed.`,
  );
}
