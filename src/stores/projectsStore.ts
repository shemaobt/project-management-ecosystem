import { create } from "zustand";
import { persist } from "zustand/middleware";
import { projectListAvailable, projectsAPI } from "../services/api";
import type { Project } from "../types/project";
import {
  createHydrationSlot,
  hydrateOnce,
  NOT_HYDRATED,
  type HydrationStatus,
} from "./hydration";

const PROJECTS_KEY = "shema-projects-v1";

/**
 * 4 since INT-12 (OBT-417): the bump discards every list an older build wrote — the whole
 * fixture set, contacts and unauthorized prayer text included — the first time this store loads.
 */
export const PROJECTS_VERSION = 4;

interface ProjectsState extends HydrationStatus {
  projects: Project[];
  hydrate: () => Promise<void>;
  reload: () => Promise<void>;
  saveProject: (project: Project) => void;
  importProjects: (projects: Project[]) => void;
}

type PersistedProjects = Pick<ProjectsState, "projects" | "hydrated">;

export const useProjectsStore = create<ProjectsState>()(
  persist<ProjectsState, [], [], PersistedProjects>(
    (set, get) => {
      const slot = createHydrationSlot();
      const load = async () => {
        set({ projects: await projectsAPI.list() });
      };

      return {
        projects: [],
        ...NOT_HYDRATED,
        hydrate: () => hydrateOnce(slot, get, set, load),
        reload: () => hydrateOnce(slot, get, set, load, true),
        importProjects: (projects) =>
          set({ projects, ...NOT_HYDRATED, hydrated: true }),
        saveProject: (project) =>
          set((state) => {
            const index = state.projects.findIndex(
              (item) => item.id === project.id,
            );
            if (index < 0) return { projects: [project, ...state.projects] };
            const projects = [...state.projects];
            projects[index] = project;
            return { projects };
          }),
      };
    },
    {
      name: PROJECTS_KEY,
      version: PROJECTS_VERSION,
      migrate: () => ({ projects: [], hydrated: false }),
      // Kept in the browser only where the list is the demo itself; a server build writes
      // nothing here, so a shared device never holds another reader's projects.
      partialize: (state) =>
        projectListAvailable
          ? { projects: state.projects, hydrated: state.hydrated }
          : { projects: [], hydrated: false },
    },
  ),
);

export const selectProject = (
  projects: readonly Project[],
  id: string,
): Project | undefined => projects.find((project) => project.id === id);
