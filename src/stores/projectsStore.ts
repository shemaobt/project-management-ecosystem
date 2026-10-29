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
import type { ListFacets } from "../types/projectBrowse";
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
  /**
   * How many of `projects` had their place reduced, **as the server counted it** — the same
   * number the Projetos screen reads off its own browse (§5.1). `null` with no server: the
   * fixture list was read for nobody, so `withheldNotice` answers for it.
   */
  locationsWithheld: number | null;
  /**
   * The server's counts of the whole list, read in the same browse (OBT-590) — what the Início
   * band shows, so each number is the one the server answers its link with. `null` with no
   * server, where the band counts the fixture list itself, and while the list is `outdated`.
   */
  facets: ListFacets | null;
  /**
   * A write this console made — a record saved or created, a reading filed, an import, a
   * project confirmed — changed the server's list after it was read. The list stays on
   * screen, the counts do not, and the next screen that asks for it reads it again.
   */
  outdated: boolean;
  hydrate: () => Promise<void>;
  /**
   * For a screen read again each time it opens — the Início (OBT-663). Against the server
   * somebody else may have written since the list was read, and only reading it again shows
   * that; a read already on its way will do. Without a server nobody else writes the fixture
   * seed, and reading it again would drop a local import, so it reads only as `hydrate` does.
   */
  revisit: () => Promise<void>;
  /**
   * The header's *Recarregar*, and every "try again": read the list again now, and tell each
   * read of it on screen through its own requests — the Projetos browses — to ask again
   * (`onListReread`). Resolves to whether the list was read; a failure was already said.
   */
  reload: () => Promise<boolean>;
  invalidate: () => void;
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

export interface ProjectList {
  projects: Project[];
  locationsWithheld: number | null;
  facets: ListFacets | null;
}

export async function loadProjectList(): Promise<ProjectList> {
  if (!SERVED) {
    return { projects: await projectsAPI.list(), locationsWithheld: null, facets: null };
  }
  const page = await projectBrowseAPI.browse(EVERY_PROJECT_IN_REACH);
  return {
    projects: page.items,
    locationsWithheld: page.locationsWithheld,
    facets: { counts: page.counts, matched: page.matched },
  };
}

/** Whether the list is the server's — what tells a screen whose withheld count to trust. */
export const PROJECT_LIST_SERVED = SERVED;

const rereads = new Set<() => void>();

/**
 * Somebody asked for the server's list again — the *Recarregar*, or a write of ours (OBT-663).
 * The Projetos screen reads the list through its own browses, which no read of this store
 * reaches, so they listen here and ask again; otherwise a base that vanished stays among the
 * options and a saved view on it opens on nothing, silently, until a new sign-in.
 */
export function onListReread(listener: () => void): () => void {
  rereads.add(listener);
  return () => {
    rereads.delete(listener);
  };
}

function announceReread(): void {
  rereads.forEach((listener) => listener());
}

export const useProjectsStore = create<ProjectsState>()(
  persist<ProjectsState, [], [], PersistedProjects>(
    (set, get) => {
      const slot = createHydrationSlot();
      let writes = 0;
      const load = async (): Promise<void> => {
        const seen = writes;
        const list = await loadProjectList();
        // Read before the last write: that is not the list any more, so read it again.
        if (seen !== writes) return load();
        set({ ...list, outdated: false });
      };

      return {
        projects: [],
        locationsWithheld: null,
        facets: null,
        outdated: false,
        ...NOT_HYDRATED,
        hydrate: () => hydrateOnce(slot, get, set, load, get().outdated),
        revisit: () => hydrateOnce(slot, get, set, load, SERVED || get().outdated),
        reload: async () => {
          announceReread();
          await hydrateOnce(slot, get, set, load, true);
          return get().error === null;
        },
        // Without a server the list is the fixture seed, which no record write reaches
        // (the record double keeps its own overlay), so there is nothing to read again.
        invalidate: () => {
          if (!SERVED) return;
          writes += 1;
          set({ outdated: true, facets: null });
          announceReread();
        },
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
