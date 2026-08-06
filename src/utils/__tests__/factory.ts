import { createEmptyProject } from "../../fixtures/blank";
import type { Project } from "../../types/project";

export function makeProject(overrides: Partial<Project> = {}): Project {
  return { ...createEmptyProject("test-project"), ...overrides };
}
