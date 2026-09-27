import { failure } from "../services/api/errors";
import type { ProjectMember, ProjectRef } from "../types/project";

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
