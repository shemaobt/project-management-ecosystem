import { create } from "zustand";
import { persist } from "zustand/middleware";
import { projectsAPI } from "../fixtures";
import type { Project } from "../types/project";

const PROJECTS_KEY = "shema-projects-v1";

export const PROJECTS_VERSION = 3;

interface ProjectsState {
  projects: Project[];
  hydrated: boolean;
  hydrate: () => Promise<void>;
  saveProject: (project: Project) => void;
}

type PersistedProjects = Pick<ProjectsState, "projects" | "hydrated">;

export const useProjectsStore = create<ProjectsState>()(
  persist<ProjectsState, [], [], PersistedProjects>(
    (set, get) => ({
      projects: [],
      hydrated: false,
      hydrate: async () => {
        if (get().hydrated) return;
        const list = await projectsAPI.list();
        set({ projects: list, hydrated: true });
      },
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
    }),
    {
      name: PROJECTS_KEY,
      version: PROJECTS_VERSION,
      migrate: () => ({ projects: [], hydrated: false }),
      partialize: (state) => ({
        projects: state.projects,
        hydrated: state.hydrated,
      }),
    },
  ),
);

export const selectProject = (
  projects: readonly Project[],
  id: string,
): Project | undefined => projects.find((project) => project.id === id);
