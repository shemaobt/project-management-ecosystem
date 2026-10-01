import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { DEFAULT_TAB } from "../../../constants/recordTabs";
import {
  PROJECT_LIST_SERVED,
  useProjectsStore,
} from "../../../stores/projectsStore";
import type { Project } from "../../../types/project";
import type { ApiFailure } from "../../../types/session";
import { withheldNotice } from "../../../utils/region";
import { ProjectsUnread } from "../../common/ProjectsUnread";
import { Globe } from "../projetos/Atlas/Globe";
import { Hero } from "./Hero";

export interface InicioViewProps {
  projects: readonly Project[] | null;
  onOpen: (project: Project) => void;
  /**
   * The globe's withheld note. Against the server it is the browse's own count — the number
   * Projetos shows (§5.1) — so the two screens never disagree; omitted, it is derived from the
   * rows, which is how the fixture list answers it.
   */
  locationsWithheld?: number | null;
  /** Why the project list could not be read — said, with a retry, below the greeting. */
  loadFailure?: ApiFailure | null;
  onRetry?: () => void;
}

export function InicioView({
  projects,
  onOpen,
  locationsWithheld,
  loadFailure = null,
  onRetry,
}: InicioViewProps) {
  const unread = projects === null && loadFailure !== null && onRetry !== undefined;
  return (
    <>
      <Hero projects={projects} showBand={!unread} />
      {unread && loadFailure && onRetry && (
        <div className="mx-auto w-full max-w-(--container-wide) px-5 pt-6 sm:px-8">
          <ProjectsUnread failure={loadFailure} onRetry={onRetry} />
        </div>
      )}
      {projects !== null && projects.length > 0 && (
        <div className="mx-auto w-full max-w-(--container-wide) px-5 pt-6 pb-20 sm:px-8">
          <Globe
            projects={projects}
            locationsWithheld={
              locationsWithheld === undefined
                ? withheldNotice(projects)
                : locationsWithheld
            }
            listPageSize={null}
            onSelect={onOpen}
          />
        </div>
      )}
    </>
  );
}

export function InicioPage() {
  const projects = useProjectsStore((state) => state.projects);
  const hydrated = useProjectsStore((state) => state.hydrated);
  const hydrate = useProjectsStore((state) => state.hydrate);
  const served = useProjectsStore((state) => state.locationsWithheld);
  const loadFailure = useProjectsStore((state) => state.error);
  const reload = useProjectsStore((state) => state.reload);
  const navigate = useNavigate();

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  const openRecord = (project: Project) => {
    navigate(`/ficha/${project.id}/${DEFAULT_TAB}`);
  };

  return (
    <InicioView
      projects={hydrated ? projects : null}
      onOpen={openRecord}
      locationsWithheld={PROJECT_LIST_SERVED ? served : undefined}
      loadFailure={loadFailure}
      onRetry={() => void reload()}
    />
  );
}
