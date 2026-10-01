import { create } from "zustand";
import { persist } from "zustand/middleware";
import { DEFAULT_SORT } from "../constants/sorting";
import {
  projectBrowseAPI,
  projectsAPI,
  resolveSource,
  type ProjectBrowseQuery,
} from "../services/api";
import type { Project } from "../types/project";
import { EMPTY_FILTERS } from "./filtersStore";
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

/**
 * The whole list, read the way the Projetos screen reads it (OBT-557): BE-05's browse with no
 * filter and no page answers every project the reader reaches, already scoped and already
 * reduced — the sensitive places, the unauthorized prayer text — by the server. `projectsAPI`
 * is still the fixture double, because BE-05 never shipped a plain list, so against the server
 * this store asks the browse; with no server it reads the fixture, as wave 1 did.
 */
const SERVED = resolveSource("projectsBrowse") === "api";

const EVERY_PROJECT_IN_REACH: ProjectBrowseQuery = {
  filters: EMPTY_FILTERS,
  search: "",
  sort: DEFAULT_SORT,
  limit: null,
  offset: 0,
};

export async function loadProjectList(): Promise<Project[]> {
  return SERVED
    ? (await projectBrowseAPI.browse(EVERY_PROJECT_IN_REACH)).items
    : projectsAPI.list();
}

export const useProjectsStore = create<ProjectsState>()(
  persist<ProjectsState, [], [], PersistedProjects>(
    (set, get) => {
      const slot = createHydrationSlot();
      const load = async () => {
        set({ projects: await loadProjectList() });
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
      // Kept in the browser only where the list is the demo itself; against the server
      // nothing is written here, so a shared device never holds another reader's projects.
      partialize: (state) =>
        SERVED
          ? { projects: [], hydrated: false }
          : { projects: state.projects, hydrated: state.hydrated },
    },
  ),
);

export const selectProject = (
  projects: readonly Project[],
  id: string,
): Project | undefined => projects.find((project) => project.id === id);
